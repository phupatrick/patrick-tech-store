import { randomInt } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { addDurationToDate } from "@/lib/duration";
import { createJsonFileStore } from "@/lib/json-file-store";
import { Order, OrderStatus, PendingCheckout, Product } from "@/lib/types";

const dataDirectory = path.join(process.cwd(), "src", "data");
const ordersFile = path.join(dataDirectory, "orders.json");
const STORE_TIME_ZONE = "Asia/Ho_Chi_Minh";

const seedOrders: Order[] = [];

const ensureStore = () => {
  if (!existsSync(dataDirectory)) {
    mkdirSync(dataDirectory, { recursive: true });
  }

  if (!existsSync(ordersFile)) {
    writeFileSync(ordersFile, JSON.stringify(seedOrders, null, 2), "utf8");
  }
};

const parseDate = (value: string, endOfDay = false) => {
  if (!value) {
    return new Date(Number.NaN);
  }

  if (value.includes("T")) {
    return new Date(value);
  }

  return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
};

const addDays = (value: string, days: number) => {
  const date = parseDate(value, true);
  date.setDate(date.getDate() + days);
  return date;
};

const formatDateInput = (value: Date) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: STORE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
};

const getOrderStatus = (warrantyUntil: string, now = new Date()): OrderStatus =>
  parseDate(warrantyUntil, true).getTime() >= now.getTime() ? "active" : "expired";

export const getOrderCleanupDate = (warrantyUntil: string) => addDays(warrantyUntil, 7);

const shouldKeepOrder = (order: Order, now = new Date()) => getOrderCleanupDate(order.warrantyUntil).getTime() >= now.getTime();

const normalizeOrder = (order: Partial<Order>, index: number): Order => {
  const createdAt = order.createdAt ?? `${order.purchaseDate ?? "2026-03-01"}T09:00:00.000Z`;
  const purchaseDate = order.purchaseDate ?? formatDateInput(parseDate(createdAt));
  const warrantyUntil = order.warrantyUntil ?? purchaseDate;

  return {
    id: String(order.id ?? `${index + 1}`.padStart(8, "0")),
    name: order.name?.trim() || order.productId || `Don hang ${index + 1}`,
    content: order.content?.trim() || "",
    phone: order.phone?.trim() || undefined,
    productId: order.productId?.trim() || undefined,
    warrantyCode: order.warrantyCode?.trim() || undefined,
    source: order.source ?? "manual",
    customerRole: order.customerRole,
    customerVip: Boolean(order.customerVip),
    customerLabel: order.customerLabel?.trim() || undefined,
    customerIp: order.customerIp?.trim() || undefined,
    customerAddress: order.customerAddress?.trim() || undefined,
    originalPrice: Number.isFinite(order.originalPrice) ? order.originalPrice : undefined,
    discountAmount: Number.isFinite(order.discountAmount) ? order.discountAmount : 0,
    finalPrice: Number.isFinite(order.finalPrice) ? order.finalPrice : undefined,
    costPrice: Number.isFinite(order.costPrice) ? order.costPrice : undefined,
    profit: Number.isFinite(order.profit) ? order.profit : undefined,
    purchaseDate,
    warrantyUntil,
    status: getOrderStatus(warrantyUntil),
    createdAt,
    updatedAt: order.updatedAt ?? createdAt
  };
};

const sortOrders = (orders: Order[]) => [...orders].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));

const cleanupOrders = (orders: Order[]) => orders.filter((order) => shouldKeepOrder(order));

const normalizeOrders = (orders: Partial<Order>[]) => cleanupOrders(orders.map(normalizeOrder));

const orderStore = createJsonFileStore<Order[]>({
  ensureFile: ensureStore,
  filePath: ordersFile,
  parse: (content) => normalizeOrders(JSON.parse(content) as Partial<Order>[]),
  serialize: (orders) => JSON.stringify(sortOrders(orders), null, 2)
});

const saveNormalizedOrders = (orders: Order[]) => {
  orderStore.write(sortOrders(orders));
};

export const listOrders = () => {
  const orders = orderStore.read();
  const cleanedOrders = cleanupOrders(orders);

  if (cleanedOrders.length !== orders.length) {
    saveNormalizedOrders(cleanedOrders);
  }

  return sortOrders(cleanedOrders).map((order) => ({
    ...order,
    status: getOrderStatus(order.warrantyUntil)
  }));
};

export const getOrderById = (orderId: string) => listOrders().find((order) => order.id === orderId);

const generateUniqueOrderId = (existingIds: Set<string>) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = String(randomInt(0, 100000000)).padStart(8, "0");

    if (!existingIds.has(candidate)) {
      return candidate;
    }
  }

  throw new Error("Could not generate a unique order code.");
};

export const createOrderRecord = ({
  name,
  content,
  warrantyUntil,
  source,
  customerRole,
  customerVip,
  customerLabel,
  customerIp,
  customerAddress,
  originalPrice,
  discountAmount,
  finalPrice,
  costPrice,
  profit
}: {
  name: string;
  content: string;
  warrantyUntil: string;
  source?: Order["source"];
  customerRole?: Order["customerRole"];
  customerVip?: boolean;
  customerLabel?: string;
  customerIp?: string;
  customerAddress?: string;
  originalPrice?: number;
  discountAmount?: number;
  finalPrice?: number;
  costPrice?: number;
  profit?: number;
}) => {
  const orders = listOrders();
  const now = new Date();
  const orderId = generateUniqueOrderId(new Set(orders.map((order) => order.id)));
  const createdAt = now.toISOString();
  const purchaseDate = formatDateInput(now);
  const order: Order = {
    id: orderId,
    name: name.trim(),
    content: content.trim(),
    source: source ?? "manual",
    customerRole,
    customerVip: Boolean(customerVip),
    customerLabel: customerLabel?.trim() || undefined,
    customerIp: customerIp?.trim() || undefined,
    customerAddress: customerAddress?.trim() || undefined,
    originalPrice,
    discountAmount: discountAmount ?? 0,
    finalPrice,
    costPrice,
    profit,
    purchaseDate,
    warrantyUntil,
    warrantyCode: orderId,
    status: getOrderStatus(warrantyUntil, now),
    createdAt,
    updatedAt: createdAt
  };

  saveNormalizedOrders([order, ...orders]);
  return order;
};

export const createOrderFromPendingCheckout = (pendingCheckout: PendingCheckout, product: Product) => {
  const orders = listOrders();
  const now = new Date();
  const orderId = generateUniqueOrderId(new Set(orders.map((order) => order.id)));
  const createdAt = now.toISOString();
  const purchaseDate = formatDateInput(now);
  const warrantyUntil = formatDateInput(
    addDurationToDate(parseDate(purchaseDate, true), product.warrantyDuration ?? product.warrantyMonths)
  );
  const profit = pendingCheckout.finalPrice - product.costPrice;
  const order: Order = {
    id: orderId,
    name: pendingCheckout.orderName.trim(),
    content: pendingCheckout.orderContent.trim(),
    productId: pendingCheckout.productId,
    source: "checkout",
    customerRole: pendingCheckout.customerRole,
    customerVip: pendingCheckout.customerVip,
    customerLabel: pendingCheckout.customerLabel,
    customerIp: pendingCheckout.customerIp?.trim() || undefined,
    customerAddress: pendingCheckout.customerAddress?.trim() || undefined,
    originalPrice: pendingCheckout.originalPrice,
    discountAmount: pendingCheckout.discountAmount,
    finalPrice: pendingCheckout.finalPrice,
    costPrice: product.costPrice,
    profit,
    purchaseDate,
    warrantyUntil,
    warrantyCode: orderId,
    status: getOrderStatus(warrantyUntil, now),
    createdAt,
    updatedAt: createdAt
  };

  saveNormalizedOrders([order, ...orders]);
  return order;
};
