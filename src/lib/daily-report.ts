import { listOrders } from "@/lib/order-store";
import { Order } from "@/lib/types";

export const REPORT_TIME_ZONE = "Asia/Ho_Chi_Minh";

export type DailySalesReport = {
  date: string;
  totalOrders: number;
  customerOrders: number;
  resellerOrders: number;
  vipOrders: number;
  regularOrders: number;
  grossRevenue: number;
  totalDiscount: number;
  netRevenue: number;
  totalCost: number;
  totalProfit: number;
  averageOrderValue: number;
};

const formatDateKey = (value: string | Date) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(value instanceof Date ? value : new Date(value));
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
};

export const getTodayReportDate = () => formatDateKey(new Date());

const getOrderDate = (order: Order) => {
  if (order.createdAt) {
    return formatDateKey(order.createdAt);
  }

  return order.purchaseDate;
};

export const buildDailySalesReport = (date = getTodayReportDate()): DailySalesReport => {
  const orders = listOrders().filter((order) => getOrderDate(order) === date);
  const totalOrders = orders.length;
  const customerOrders = orders.filter((order) => order.customerRole === "customer").length;
  const resellerOrders = orders.filter((order) => order.customerRole === "reseller").length;
  const vipOrders = orders.filter((order) => order.customerVip).length;
  const regularOrders = totalOrders - vipOrders;
  const grossRevenue = orders.reduce((sum, order) => sum + (order.originalPrice ?? order.finalPrice ?? 0), 0);
  const totalDiscount = orders.reduce((sum, order) => sum + (order.discountAmount ?? 0), 0);
  const netRevenue = orders.reduce((sum, order) => sum + (order.finalPrice ?? 0), 0);
  const totalCost = orders.reduce((sum, order) => sum + (order.costPrice ?? 0), 0);
  const totalProfit = orders.reduce((sum, order) => sum + (order.profit ?? 0), 0);

  return {
    date,
    totalOrders,
    customerOrders,
    resellerOrders,
    vipOrders,
    regularOrders,
    grossRevenue,
    totalDiscount,
    netRevenue,
    totalCost,
    totalProfit,
    averageOrderValue: totalOrders > 0 ? Math.round(netRevenue / totalOrders) : 0
  };
};
