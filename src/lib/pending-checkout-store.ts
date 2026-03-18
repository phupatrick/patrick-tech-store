import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { createJsonFileStore } from "@/lib/json-file-store";
import { PendingCheckout } from "@/lib/types";

const dataDirectory = path.join(process.cwd(), "src", "data");
const pendingCheckoutsFile = path.join(dataDirectory, "pending-checkouts.json");

export const PENDING_CHECKOUT_TTL_MS = 60 * 60 * 1000;

const ensureStore = () => {
  if (!existsSync(dataDirectory)) {
    mkdirSync(dataDirectory, { recursive: true });
  }

  if (!existsSync(pendingCheckoutsFile)) {
    writeFileSync(pendingCheckoutsFile, JSON.stringify([], null, 2), "utf8");
  }
};

const sortPendingCheckouts = (records: PendingCheckout[]) =>
  [...records].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));

const isPendingCheckoutActive = (record: PendingCheckout, now = Date.now()) => Date.parse(record.expiresAt) > now;

const pendingCheckoutStore = createJsonFileStore<PendingCheckout[]>({
  ensureFile: ensureStore,
  filePath: pendingCheckoutsFile,
  parse: (content) => sortPendingCheckouts(JSON.parse(content) as PendingCheckout[]),
  serialize: (records) => JSON.stringify(sortPendingCheckouts(records), null, 2)
});

const savePendingCheckouts = (records: PendingCheckout[]) => {
  pendingCheckoutStore.write(sortPendingCheckouts(records));
};

export const listPendingCheckouts = () => {
  const records = pendingCheckoutStore.read();
  const activeRecords = records.filter((record) => isPendingCheckoutActive(record));

  if (activeRecords.length !== records.length) {
    savePendingCheckouts(activeRecords);
  }

  return activeRecords;
};

export const createPendingCheckoutRecord = (
  input: Omit<PendingCheckout, "id" | "token" | "createdAt" | "expiresAt">
) => {
  const records = listPendingCheckouts();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + PENDING_CHECKOUT_TTL_MS).toISOString();
  const record: PendingCheckout = {
    id: randomUUID(),
    token: randomBytes(24).toString("hex"),
    createdAt,
    expiresAt,
    ...input
  };

  savePendingCheckouts([record, ...records]);
  return record;
};

export const getPendingCheckoutByToken = (token: string) =>
  listPendingCheckouts().find((record) => record.token === token);

export const getPendingCheckoutById = (checkoutId: string) =>
  listPendingCheckouts().find((record) => record.id === checkoutId);

export const deletePendingCheckout = (checkoutId: string) => {
  const records = listPendingCheckouts();
  const nextRecords = records.filter((record) => record.id !== checkoutId);

  if (nextRecords.length === records.length) {
    return false;
  }

  savePendingCheckouts(nextRecords);
  return true;
};

export const updatePendingCheckout = (
  checkoutId: string,
  updater: (record: PendingCheckout) => PendingCheckout
) => {
  const records = listPendingCheckouts();
  const existing = records.find((record) => record.id === checkoutId);

  if (!existing) {
    return undefined;
  }

  const updated = updater(existing);
  savePendingCheckouts(records.map((record) => (record.id === checkoutId ? updated : record)));
  return updated;
};

export const getReservedVoucherMap = (accessCodeId?: string) => {
  const records = listPendingCheckouts();
  const reservations = new Map<string, { checkoutId: string; expiresAt: string }>();

  records.forEach((record) => {
    if (!record.voucherId) {
      return;
    }

    if (accessCodeId && record.accessCodeId !== accessCodeId) {
      return;
    }

    reservations.set(record.voucherId, {
      checkoutId: record.id,
      expiresAt: record.expiresAt
    });
  });

  return reservations;
};
