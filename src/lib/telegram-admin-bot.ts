import { buildDailySalesReport, getTodayReportDate } from "@/lib/daily-report";
import { processPendingCheckoutDecision } from "@/lib/checkout-processing";
import { getOrderById, listOrders } from "@/lib/order-store";
import { listPendingCheckouts } from "@/lib/pending-checkout-store";
import {
  answerTelegramCallbackQuery,
  clearTelegramMessageInlineKeyboard,
  editTelegramMessageText,
  isAuthorizedTelegramAdminChat,
  sendTelegramChatMessage
} from "@/lib/telegram";
import { createTelegramAdminLoginUrl, getTelegramWebAdminTtlMinutes } from "@/lib/telegram-web-admin";
import { Order, PendingCheckout } from "@/lib/types";

type TelegramChat = {
  id: number | string;
};

type TelegramMessage = {
  message_id: number;
  chat: TelegramChat;
  text?: string;
};

type TelegramCallbackQuery = {
  id: string;
  data?: string;
  message?: TelegramMessage;
};

type TelegramUpdate = {
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

type TelegramAdminHandleContext = {
  appBaseUrl?: string;
};

const REPORT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PENDING_TO_SHOW = 5;
const MAX_ORDERS_TO_SHOW = 5;

const formatMoney = (value?: number) => (value ?? 0).toLocaleString("vi-VN");

const buildMainMenu = () => ({
  inline_keyboard: [
    [
      { text: "Dashboard", callback_data: "menu:dashboard" },
      { text: "Pending", callback_data: "menu:pending" }
    ],
    [
      { text: "Don gan nhat", callback_data: "menu:orders" },
      { text: "Bao cao hom nay", callback_data: "menu:report" }
    ],
    [
      { text: "Web admin", callback_data: "menu:webadmin" },
      { text: "CMT live", callback_data: "menu:cmt" }
    ]
  ]
});

const buildCommitStatusText = (appBaseUrl?: string) => {
  const commit =
    process.env.RENDER_GIT_COMMIT ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GIT_COMMIT_SHA ??
    process.env.COMMIT_SHA;
  const branch = process.env.RENDER_GIT_BRANCH ?? process.env.VERCEL_GIT_COMMIT_REF ?? "main";
  const serviceName = process.env.RENDER_SERVICE_NAME ?? "patrick-tech-store";
  const publicUrl = process.env.RENDER_EXTERNAL_URL ?? appBaseUrl ?? "Chua co domain public";
  const provider =
    process.env.RENDER_SERVICE_NAME ? "Render" : process.env.VERCEL ? "Vercel" : "Local runtime";

  return [
    "Trang thai commit / deploy",
    `Service: ${serviceName}`,
    `Nen tang: ${provider}`,
    `Branch: ${branch}`,
    commit ? `Commit live: ${commit.slice(0, 7)}` : "Commit live: khong doc duoc tu runtime",
    `URL: ${publicUrl}`
  ].join("\n");
};

const buildHelpText = () =>
  [
    "Bot quan ly tu xa cho admin",
    "",
    "/dashboard - tong quan hom nay",
    "/pending - xem don dang cho xac nhan",
    "/orders - xem 5 don gan nhat",
    "/order <ma> - xem chi tiet don",
    "/report [YYYY-MM-DD] - bao cao theo ngay",
    "/cmt - xem commit/deploy dang live tren web",
    "/webadmin - nhan link vao trang admin web",
    "/help - xem tro giup"
  ].join("\n");

const buildPendingCheckoutText = (pendingCheckout: PendingCheckout) =>
  [
    "Don dang cho xac nhan",
    `Ma don: ${pendingCheckout.orderCode ?? pendingCheckout.id.slice(0, 8).toUpperCase()}`,
    `Ma tam: ${pendingCheckout.id}`,
    `Khach: ${pendingCheckout.customerLabel}`,
    `Vai tro: ${pendingCheckout.customerRole}${pendingCheckout.customerVip ? " VIP" : ""}`,
    `San pham: ${pendingCheckout.productName}`,
    `Gia hien thi: ${pendingCheckout.displayPrice}`,
    `Thanh toan quy doi: ${formatMoney(pendingCheckout.finalPrice)} VND`,
    pendingCheckout.voucherDefinitionId ? `Voucher: ${pendingCheckout.voucherDefinitionId}` : "Voucher: khong dung",
    `Het han: ${new Date(pendingCheckout.expiresAt).toLocaleString("vi-VN")}`
  ]
    .filter(Boolean)
    .join("\n");

const buildOrderText = (order: Order) =>
  [
    `Don ${order.id}`,
    `Ten: ${order.name}`,
    order.customerLabel ? `Khach: ${order.customerLabel}` : undefined,
    order.customerRole ? `Vai tro: ${order.customerRole}${order.customerVip ? " VIP" : ""}` : undefined,
    order.finalPrice !== undefined ? `Thuc thu: ${formatMoney(order.finalPrice)} VND` : undefined,
    order.costPrice !== undefined ? `Gia von: ${formatMoney(order.costPrice)} VND` : undefined,
    order.profit !== undefined ? `Lai: ${formatMoney(order.profit)} VND` : undefined,
    `Bao hanh den: ${order.warrantyUntil}`,
    `Trang thai: ${order.status}`
  ]
    .filter(Boolean)
    .join("\n");

const buildDashboardText = () => {
  const today = getTodayReportDate();
  const report = buildDailySalesReport(today);
  const pendingCount = listPendingCheckouts().length;

  return [
    `Dashboard ${today}`,
    `Don cho xac nhan: ${pendingCount}`,
    `Tong don hom nay: ${report.totalOrders}`,
    `Doanh thu goc: ${formatMoney(report.grossRevenue)} VND`,
    `Thuc thu: ${formatMoney(report.netRevenue)} VND`,
    `Gia von: ${formatMoney(report.totalCost)} VND`,
    `Lai: ${formatMoney(report.totalProfit)} VND`
  ].join("\n");
};

const buildDailyReportText = (date: string) => {
  const report = buildDailySalesReport(date);

  return [
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
    `Lai: ${formatMoney(report.totalProfit)} VND`
  ].join("\n");
};

const buildPendingKeyboard = (pendingCheckoutId: string) => ({
  inline_keyboard: [
    [
      { text: "Xac nhan", callback_data: `pc:c:${pendingCheckoutId}` },
      { text: "That bai", callback_data: `pc:r:${pendingCheckoutId}` }
    ]
  ]
});

const sendHelp = async (chatId: number | string) =>
  sendTelegramChatMessage({
    chatId,
    text: buildHelpText(),
    reply_markup: buildMainMenu()
  });

const sendDashboard = async (chatId: number | string) =>
  sendTelegramChatMessage({
    chatId,
    text: buildDashboardText(),
    reply_markup: buildMainMenu()
  });

const sendPendingList = async (chatId: number | string) => {
  const pendingCheckouts = listPendingCheckouts().slice(0, MAX_PENDING_TO_SHOW);

  if (pendingCheckouts.length === 0) {
    return sendTelegramChatMessage({
      chatId,
      text: "Khong co don nao dang cho xac nhan.",
      reply_markup: buildMainMenu()
    });
  }

  await sendTelegramChatMessage({
    chatId,
    text: `Co ${listPendingCheckouts().length} don dang cho xac nhan. Dang hien thi ${pendingCheckouts.length} don moi nhat.`
  });

  for (const pendingCheckout of pendingCheckouts) {
    await sendTelegramChatMessage({
      chatId,
      text: buildPendingCheckoutText(pendingCheckout),
      reply_markup: buildPendingKeyboard(pendingCheckout.id)
    });
  }

  return { ok: true as const };
};

const sendRecentOrders = async (chatId: number | string) => {
  const orders = listOrders().slice(0, MAX_ORDERS_TO_SHOW);

  if (orders.length === 0) {
    return sendTelegramChatMessage({
      chatId,
      text: "Chua co don hang nao.",
      reply_markup: buildMainMenu()
    });
  }

  return sendTelegramChatMessage({
    chatId,
    text: ["5 don gan nhat", "", ...orders.map((order) => buildOrderText(order))].join("\n\n"),
    reply_markup: buildMainMenu()
  });
};

const sendOrderLookup = async (chatId: number | string, orderId?: string) => {
  if (!orderId) {
    return sendTelegramChatMessage({
      chatId,
      text: "Cu phap dung: /order 12345678",
      reply_markup: buildMainMenu()
    });
  }

  const order = getOrderById(orderId.trim());

  if (!order) {
    return sendTelegramChatMessage({
      chatId,
      text: `Khong tim thay don ${orderId.trim()}.`,
      reply_markup: buildMainMenu()
    });
  }

  return sendTelegramChatMessage({
    chatId,
    text: buildOrderText(order),
    reply_markup: buildMainMenu()
  });
};

const sendDailyReport = async (chatId: number | string, date?: string) => {
  const resolvedDate = date && REPORT_DATE_PATTERN.test(date) ? date : getTodayReportDate();

  return sendTelegramChatMessage({
    chatId,
    text: buildDailyReportText(resolvedDate),
    reply_markup: buildMainMenu()
  });
};

const sendCommitStatus = async (chatId: number | string, appBaseUrl?: string) =>
  sendTelegramChatMessage({
    chatId,
    text: buildCommitStatusText(appBaseUrl),
    reply_markup: buildMainMenu()
  });

const sendWebAdminAccess = async (chatId: number | string, appBaseUrl?: string) => {
  const loginUrl = createTelegramAdminLoginUrl({
    chatId,
    appBaseUrl,
    nextPath: "/admin/products"
  });

  if (!loginUrl) {
    return sendTelegramChatMessage({
      chatId,
      text: "Chua co APP_BASE_URL hoac domain public, nen bot chua tao duoc link vao admin web.",
      reply_markup: buildMainMenu()
    });
  }

  return sendTelegramChatMessage({
    chatId,
    text: [
      "Bot da duoc cap quyen admin web.",
      `Mo link nay de vao thang trang quan tri: ${loginUrl}`,
      `Link co hieu luc ${getTelegramWebAdminTtlMinutes()} phut.`
    ].join("\n"),
    reply_markup: buildMainMenu()
  });
};

const handleDecisionCallback = async (callbackQuery: TelegramCallbackQuery, decision: "confirm" | "reject", pendingCheckoutId: string) => {
  const chatId = callbackQuery.message?.chat.id;
  const messageId = callbackQuery.message?.message_id;
  const messageText = callbackQuery.message?.text;

  if (!chatId || !messageId) {
    return;
  }

  const result = processPendingCheckoutDecision({ pendingCheckoutId, decision });

  await answerTelegramCallbackQuery({
    callbackQueryId: callbackQuery.id,
    text: result.description,
    showAlert: !result.ok
  });

  const statusLine =
    result.ok && result.code === "confirmed"
      ? `Trang thai: DA XAC NHAN / Ma don ${result.order?.id ?? "-"}`
      : result.ok
        ? "Trang thai: DA TU CHOI"
        : `Trang thai: ${result.title.toUpperCase()}`;

  const nextText = [messageText ?? "Don hang", "", statusLine].join("\n");

  await editTelegramMessageText({
    chatId,
    messageId,
    text: nextText
  });
  await clearTelegramMessageInlineKeyboard({ chatId, messageId });

  if (result.ok && result.code === "confirmed") {
    await sendTelegramChatMessage({
      chatId,
      text: [
        `Da tao don ${result.order?.id ?? "-"}`,
        result.pointsAwarded ? `Diem cong them: ${result.pointsAwarded}` : "Khong cong diem bo sung."
      ].join("\n"),
      reply_markup: buildMainMenu()
    });
  }
};

const handleMenuCallback = async (callbackQuery: TelegramCallbackQuery, action: string, context: TelegramAdminHandleContext) => {
  const chatId = callbackQuery.message?.chat.id;

  if (!chatId) {
    return;
  }

  await answerTelegramCallbackQuery({
    callbackQueryId: callbackQuery.id,
    text: "Dang tai du lieu..."
  });

  switch (action) {
    case "dashboard":
      await sendDashboard(chatId);
      break;
    case "pending":
      await sendPendingList(chatId);
      break;
    case "orders":
      await sendRecentOrders(chatId);
      break;
    case "report":
      await sendDailyReport(chatId);
      break;
    case "cmt":
      await sendCommitStatus(chatId, context.appBaseUrl);
      break;
    case "webadmin":
      await sendWebAdminAccess(chatId, context.appBaseUrl);
      break;
    default:
      await sendHelp(chatId);
      break;
  }
};

const handleCommandMessage = async (message: TelegramMessage, context: TelegramAdminHandleContext) => {
  const chatId = message.chat.id;
  const text = message.text?.trim() ?? "";
  const [commandWithMention, ...args] = text.split(/\s+/);
  const command = commandWithMention.toLowerCase().split("@")[0];

  switch (command) {
    case "/start":
    case "/help":
      await sendHelp(chatId);
      return;
    case "/dashboard":
      await sendDashboard(chatId);
      return;
    case "/pending":
      await sendPendingList(chatId);
      return;
    case "/orders":
      await sendRecentOrders(chatId);
      return;
    case "/order":
      await sendOrderLookup(chatId, args[0]);
      return;
    case "/report":
      await sendDailyReport(chatId, args[0]);
      return;
    case "/cmt":
    case "/commit":
      await sendCommitStatus(chatId, context.appBaseUrl);
      return;
    case "/webadmin":
      await sendWebAdminAccess(chatId, context.appBaseUrl);
      return;
    default:
      await sendTelegramChatMessage({
        chatId,
        text: "Lenh khong duoc ho tro. Gui /help de xem danh sach lenh.",
        reply_markup: buildMainMenu()
      });
  }
};

export const handleTelegramAdminUpdate = async (update: TelegramUpdate, context: TelegramAdminHandleContext = {}) => {
  const messageChatId = update.message?.chat.id;
  const callbackChatId = update.callback_query?.message?.chat.id;
  const chatId = messageChatId ?? callbackChatId;

  if (!chatId || !isAuthorizedTelegramAdminChat(chatId)) {
    if (update.callback_query?.id) {
      await answerTelegramCallbackQuery({
        callbackQueryId: update.callback_query.id,
        text: "Chat nay khong duoc phep quan tri.",
        showAlert: true
      });
    }

    return;
  }

  if (update.callback_query?.data) {
    const [scope, action, value] = update.callback_query.data.split(":");

    if (scope === "pc" && value && (action === "c" || action === "r")) {
      await handleDecisionCallback(update.callback_query, action === "c" ? "confirm" : "reject", value);
      return;
    }

    if (scope === "menu" && action) {
      await handleMenuCallback(update.callback_query, action, context);
      return;
    }
  }

  if (update.message?.text) {
    await handleCommandMessage(update.message, context);
  }
};
