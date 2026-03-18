import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { createJsonFileStore } from "@/lib/json-file-store";
import { OwnedVoucher, AccessCodeRecord, AccessRole, ResellerTier, VoucherDefinitionId } from "@/lib/types";

const dataDirectory = path.join(process.cwd(), "src", "data");
const accessCodeFile = path.join(dataDirectory, "access-codes.json");

const ensureStore = () => {
  if (!existsSync(dataDirectory)) {
    mkdirSync(dataDirectory, { recursive: true });
  }

  if (!existsSync(accessCodeFile)) {
    writeFileSync(accessCodeFile, JSON.stringify([], null, 2), "utf8");
  }
};

const hashAccessCode = (code: string, salt: string) => scryptSync(code, salt, 32).toString("hex");

const resolveTierByRole = (role: AccessRole, tier?: string): ResellerTier => {
  if (role === "reseller" || role === "customer") {
    return "regular";
  }

  return "guest";
};

const normalizeOwnedVoucher = (voucher: OwnedVoucher): OwnedVoucher => ({
  id: voucher.id,
  definitionId: voucher.definitionId,
  createdAt: voucher.createdAt,
  usedAt: voucher.usedAt || undefined
});

const normalizeAccessCodeRecord = (record: AccessCodeRecord) => ({
  ...record,
  tier: resolveTierByRole(record.role, record.tier),
  points: Number.isFinite(record.points) ? Math.max(0, Math.floor(record.points)) : 0,
  vip: Boolean(record.vip),
  vouchers: Array.isArray(record.vouchers) ? record.vouchers.map(normalizeOwnedVoucher) : []
});

const normalizeAccessCodes = (records: AccessCodeRecord[]) =>
  [...records].map(normalizeAccessCodeRecord).sort((left, right) => right.createdAt.localeCompare(left.createdAt));

const accessCodeStore = createJsonFileStore<AccessCodeRecord[]>({
  ensureFile: ensureStore,
  filePath: accessCodeFile,
  parse: (content) => normalizeAccessCodes(JSON.parse(content) as AccessCodeRecord[]),
  serialize: (records) => JSON.stringify(normalizeAccessCodes(records), null, 2)
});

const saveRawAccessCodes = (records: AccessCodeRecord[]) => {
  accessCodeStore.write(normalizeAccessCodes(records));
};

const updateAccessCode = (
  accessCodeId: string,
  updater: (record: AccessCodeRecord) => AccessCodeRecord
) => {
  const records = listAccessCodes();
  const existing = records.find((item) => item.id === accessCodeId);

  if (!existing) {
    return undefined;
  }

  const updated = normalizeAccessCodeRecord(updater(existing));
  saveRawAccessCodes(records.map((item) => (item.id === accessCodeId ? updated : item)));
  return updated;
};

export const listAccessCodes = () => {
  return accessCodeStore.read();
};

export const saveAccessCodes = (records: AccessCodeRecord[]) => {
  saveRawAccessCodes(records);
};

export const getAccessCodeById = (accessCodeId: string) => listAccessCodes().find((item) => item.id === accessCodeId);

export const verifyManagedAccessCode = (code: string) => {
  const normalizedCode = code.trim();

  if (!normalizedCode) {
    return undefined;
  }

  return listAccessCodes().find((record) => {
    if (!record.active) {
      return false;
    }

    const expectedHash = Buffer.from(record.codeHash, "hex");
    const actualHash = Buffer.from(hashAccessCode(normalizedCode, record.codeSalt), "hex");

    return expectedHash.length === actualHash.length && timingSafeEqual(expectedHash, actualHash);
  });
};

type AccessCodeInput = {
  code: string;
  label: string;
  role: AccessRole;
  tier: ResellerTier;
  points: number;
  active: boolean;
};

export const createAccessCodeRecord = (input: AccessCodeInput) => {
  const now = new Date().toISOString();
  const salt = randomBytes(16).toString("hex");
  const record: AccessCodeRecord = {
    id: randomUUID(),
    codeHash: hashAccessCode(input.code, salt),
    codeSalt: salt,
    label: input.label.trim(),
    role: input.role,
    tier: resolveTierByRole(input.role, input.tier),
    points: Math.max(0, Math.floor(input.points)),
    vip: false,
    vouchers: [],
    active: input.active,
    createdAt: now,
    updatedAt: now
  };

  saveRawAccessCodes([...listAccessCodes(), record]);
  return record;
};

type AccessCodeUpdate = {
  code?: string;
  label: string;
  role: AccessRole;
  tier: ResellerTier;
  points: number;
  active: boolean;
};

export const updateAccessCodeRecord = (accessCodeId: string, input: AccessCodeUpdate) =>
  updateAccessCode(accessCodeId, (existing) => {
    const nextSalt = input.code ? randomBytes(16).toString("hex") : existing.codeSalt;

    return {
      ...existing,
      codeSalt: nextSalt,
      codeHash: input.code ? hashAccessCode(input.code, nextSalt) : existing.codeHash,
      label: input.label.trim(),
      role: input.role,
      tier: resolveTierByRole(input.role, input.tier),
      points: Math.max(0, Math.floor(input.points)),
      active: input.active,
      updatedAt: new Date().toISOString()
    };
  });

export const deleteAccessCodeRecord = (accessCodeId: string) => {
  const records = listAccessCodes();
  const nextRecords = records.filter((item) => item.id !== accessCodeId);

  if (nextRecords.length === records.length) {
    return false;
  }

  saveRawAccessCodes(nextRecords);
  return true;
};

export const setAccessCodeActiveState = (accessCodeId: string, active: boolean) => {
  const existing = getAccessCodeById(accessCodeId);

  if (!existing) {
    return undefined;
  }

  return updateAccessCodeRecord(accessCodeId, {
    label: existing.label,
    role: existing.role,
    tier: existing.tier,
    points: existing.points,
    active
  });
};

export const setAccessCodePoints = (accessCodeId: string, points: number) =>
  updateAccessCode(accessCodeId, (existing) => ({
    ...existing,
    points: Math.max(0, Math.floor(points)),
    updatedAt: new Date().toISOString()
  }));

export const addAccessCodePoints = (accessCodeId: string, pointsToAdd: number) =>
  updateAccessCode(accessCodeId, (existing) => ({
    ...existing,
    points: Math.max(0, Math.floor(existing.points + pointsToAdd)),
    updatedAt: new Date().toISOString()
  }));

export const activateAccessCodeVip = (accessCodeId: string) =>
  updateAccessCode(accessCodeId, (existing) => ({
    ...existing,
    vip: true,
    points: 0,
    updatedAt: new Date().toISOString()
  }));

export const addOwnedVoucherToAccessCode = (accessCodeId: string, definitionId: VoucherDefinitionId, pointCost: number) =>
  updateAccessCode(accessCodeId, (existing) => ({
    ...existing,
    points: Math.max(0, Math.floor(existing.points - pointCost)),
    vouchers: [
      ...(existing.vouchers ?? []),
      {
        id: randomUUID(),
        definitionId,
        createdAt: new Date().toISOString()
      }
    ],
    updatedAt: new Date().toISOString()
  }));

export const markVoucherUsed = (accessCodeId: string, voucherId: string) =>
  updateAccessCode(accessCodeId, (existing) => ({
    ...existing,
    vouchers: (existing.vouchers ?? []).map((voucher) =>
      voucher.id === voucherId && !voucher.usedAt
        ? {
            ...voucher,
            usedAt: new Date().toISOString()
          }
        : voucher
    ),
    updatedAt: new Date().toISOString()
  }));
