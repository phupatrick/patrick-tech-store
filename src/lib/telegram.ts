import { DailySalesReport } from "@/lib/daily-report";
import { PendingCheckout } from "@/lib/types";

const TELEGRAM_API_BASE = "https://api.telegram.org";

type TelegramPayload = Record<string, unknown>;

type TelegramResult =
  | { ok: true }
  | {
      ok: false;
      reason: "missing-config" | "unauthorized-chat" | "request-failed";
    };

const parseChatIds = (value?: string) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const getTelegramConfig = () => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const merchantChatId = process.env.TELEGRAM_MERCHANT_CHAT_ID;
  const adminChatIds = parseChatIds(process.env.TELEGRAM_ADMIN_CHAT_IDS);

  return {
    botToken,
    merchantChatId,
    adminChatIds: adminChatIds.length > 0 ? adminChatIds : merchantChatId ? [merchantChatId] : [],
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET
  };
};

const callTelegramApi = async (method: string, payload: TelegramPayload): Promise<TelegramResult> => {
  const { botToken } = getTelegramConfig();

  if (!botToken) {
    return { ok: false, reason: "missing-config" };
  }

  const response = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    return { ok: false, reason: "request-failed" };
  }

  return { ok: true };
};

export const isAuthorizedTelegramAdminChat = (chatId: number | string) => {
  const { adminChatIds } = getTelegramConfig();
  return adminChatIds.includes(String(chatId));
};

export const sendTelegramChatMessage = async ({
  chatId,
  text,
  reply_markup
}: {
  chatId: number | string;
  text: string;
  reply_markup?: Record<string, unknown>;
}) =>
  callTelegramApi("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup
  });

export const answerTelegramCallbackQuery = async ({
  callbackQueryId,
  text,
  showAlert
}: {
  callbackQueryId: string;
  text: string;
  showAlert?: boolean;
}) =>
  callTelegramApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert ?? false
  });

export const editTelegramMessageText = async ({
  chatId,
  messageId,
  text,
  reply_markup
}: {
  chatId: number | string;
  messageId: number;
  text: string;
  reply_markup?: Record<string, unknown>;
}) =>
  callTelegramApi("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    reply_markup
  });

export const clearTelegramMessageInlineKeyboard = async ({
  chatId,
  messageId
}: {
  chatId: number | string;
  messageId: number;
}) =>
  callTelegramApi("editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: [] }
  });

const sendDefaultTelegramMessage = async (payload: {
  text: string;
  reply_markup?: Record<string, unknown>;
}) => {
  const { merchantChatId, adminChatIds } = getTelegramConfig();
  const targetChatId = merchantChatId ?? adminChatIds[0];

  if (!targetChatId) {
    return { ok: false as const, reason: "missing-config" as const };
  }

  return sendTelegramChatMessage({
    chatId: targetChatId,
    ...payload
  });
};

const formatMoney = (value: number) => value.toLocaleString("vi-VN");

export const sendPendingCheckoutToTelegram = async (pendingCheckout: PendingCheckout, appBaseUrl: string) => {
  const confirmUrl = new URL("/api/checkout/decision", appBaseUrl);
  confirmUrl.searchParams.set("token", pendingCheckout.token);
  confirmUrl.searchParams.set("decision", "confirm");

  const rejectUrl = new URL("/api/checkout/decision", appBaseUrl);
  rejectUrl.searchParams.set("token", pendingCheckout.token);
  rejectUrl.searchParams.set("decision", "reject");

  const message = [
    "Don hang moi",
    `Ma tam: ${pendingCheckout.id}`,
    `Khach: ${pendingCheckout.customerLabel}`,
    `Vai tro: ${pendingCheckout.customerRole}${pendingCheckout.customerVip ? " VIP" : ""}`,
    `Ngon ngu: ${pendingCheckout.language.toUpperCase()} / ${pendingCheckout.countryCode}`,
    pendingCheckout.customerAddress ? `Vi tri: ${pendingCheckout.customerAddress}` : undefined,
    pendingCheckout.customerIp ? `IP: ${pendingCheckout.customerIp}` : undefined,
    `San pham: ${pendingCheckout.productName}`,
    `Gia hien thi: ${pendingCheckout.displayPrice}`,
    `Gia goc quy doi: ${formatMoney(pendingCheckout.originalPrice)} VND`,
    `Giam gia quy doi: ${formatMoney(pendingCheckout.discountAmount)} VND`,
    `Thanh toan quy doi: ${formatMoney(pendingCheckout.finalPrice)} VND`,
    pendingCheckout.voucherDefinitionId ? `Voucher: ${pendingCheckout.voucherDefinitionId}` : "Voucher: khong dung",
    `Het han giu don: ${new Date(pendingCheckout.expiresAt).toLocaleString("vi-VN")}`,
    "",
    pendingCheckout.orderContent
  ]
    .filter(Boolean)
    .join("\n");

  return sendDefaultTelegramMessage({
    text: message,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Xac nhan", callback_data: `pc:c:${pendingCheckout.id}` },
          { text: "That bai", callback_data: `pc:r:${pendingCheckout.id}` }
        ],
        [
          { text: "Dashboard", callback_data: "menu:dashboard" },
          { text: "Pending", callback_data: "menu:pending" }
        ],
        [
          { text: "Mo trang xac nhan", url: confirmUrl.toString() },
          { text: "Mo trang that bai", url: rejectUrl.toString() }
        ]
      ]
    }
  });
};

export const sendDailySalesReportToTelegram = async (report: DailySalesReport) => {
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

  return sendDefaultTelegramMessage({
    text: lines.join("\n")
  });
};
