import "./load-env.mjs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const dataFile = path.join(process.cwd(), "src", "data", "orders.json");
const reportTimeZone = process.env.REPORT_TIME_ZONE || "Asia/Ho_Chi_Minh";
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = process.env.TELEGRAM_MERCHANT_CHAT_ID;

const formatDateKey = (value) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: reportTimeZone,
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

const normalizeOrder = (order) => ({
  createdAt: order.createdAt,
  purchaseDate: order.purchaseDate,
  customerRole: order.customerRole,
  customerVip: Boolean(order.customerVip),
  originalPrice: Number.isFinite(order.originalPrice) ? order.originalPrice : Number(order.originalPrice) || 0,
  discountAmount: Number.isFinite(order.discountAmount) ? order.discountAmount : Number(order.discountAmount) || 0,
  finalPrice: Number.isFinite(order.finalPrice) ? order.finalPrice : Number(order.finalPrice) || 0,
  costPrice: Number.isFinite(order.costPrice) ? order.costPrice : Number(order.costPrice) || 0,
  profit: Number.isFinite(order.profit) ? order.profit : Number(order.profit) || 0
});

const getOrderDateKey = (order) => (order.createdAt ? formatDateKey(order.createdAt) : order.purchaseDate);

const formatMoney = (value) => Number(value || 0).toLocaleString("vi-VN");

const buildReport = (orders, date) => {
  const filteredOrders = orders.filter((order) => getOrderDateKey(order) === date);
  const totalOrders = filteredOrders.length;
  const customerOrders = filteredOrders.filter((order) => order.customerRole === "customer").length;
  const resellerOrders = filteredOrders.filter((order) => order.customerRole === "reseller").length;
  const vipOrders = filteredOrders.filter((order) => order.customerVip).length;
  const regularOrders = totalOrders - vipOrders;
  const grossRevenue = filteredOrders.reduce((sum, order) => sum + (order.originalPrice || order.finalPrice || 0), 0);
  const totalDiscount = filteredOrders.reduce((sum, order) => sum + (order.discountAmount || 0), 0);
  const netRevenue = filteredOrders.reduce((sum, order) => sum + (order.finalPrice || 0), 0);
  const totalCost = filteredOrders.reduce((sum, order) => sum + (order.costPrice || 0), 0);
  const totalProfit = filteredOrders.reduce((sum, order) => sum + (order.profit || 0), 0);

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

const sendTelegramReport = async (report) => {
  if (!telegramBotToken || !telegramChatId) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_MERCHANT_CHAT_ID.");
  }

  const lines = [
    `Bao cao ngay ${report.date}`,
    `Tong don: ${report.totalOrders}`,
    `Don khach hang: ${report.customerOrders}`,
    `Don CTV: ${report.resellerOrders}`,
    `Don VIP: ${report.vipOrders}`,
    `Don thuong: ${report.regularOrders}`,
    `Doanh thu goc: ${formatMoney(report.grossRevenue)} VND`,
    `Giam gia: ${formatMoney(report.totalDiscount)} VND`,
    `Thuc thu: ${formatMoney(report.netRevenue)} VND`,
    `Gia von: ${formatMoney(report.totalCost)} VND`,
    `Lai: ${formatMoney(report.totalProfit)} VND`,
    `Trung binh/don: ${formatMoney(report.averageOrderValue)} VND`
  ];

  const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify({
      chat_id: telegramChatId,
      text: lines.join("\n")
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram send failed: ${response.status} ${body}`);
  }
};

const run = async () => {
  const raw = await readFile(dataFile, "utf8");
  const orders = JSON.parse(raw).map(normalizeOrder);
  const reportDate = process.env.REPORT_DATE || formatDateKey(new Date());
  const report = buildReport(orders, reportDate);

  await sendTelegramReport(report);
  console.log(`Daily report sent for ${report.date}`);
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
