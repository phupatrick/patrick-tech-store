import { createHmac, timingSafeEqual } from "node:crypto";

import { isAuthorizedTelegramAdminChat } from "@/lib/telegram";

const TELEGRAM_WEB_ADMIN_DEFAULT_PATH = "/admin/products";
const TELEGRAM_WEB_ADMIN_TTL_MINUTES = Number.parseInt(process.env.TELEGRAM_WEB_ADMIN_TTL_MINUTES ?? "10", 10);
const TELEGRAM_WEB_ADMIN_SECRET =
  process.env.TELEGRAM_WEB_ADMIN_SECRET ??
  process.env.AUTH_SESSION_SECRET ??
  "patrick-tech-store-telegram-web-admin-secret";

export const TELEGRAM_BOT_ADMIN_LABEL = "Telegram Bot Admin";

type TelegramWebAdminTokenPayload = {
  chatId: string;
  nextPath: string;
  expiresAt: number;
};

const sanitizeNextPath = (value?: string) =>
  value && value.startsWith("/admin") ? value : TELEGRAM_WEB_ADMIN_DEFAULT_PATH;

const signPayload = (payload: string) => createHmac("sha256", TELEGRAM_WEB_ADMIN_SECRET).update(payload).digest("base64url");

const encodePayload = (payload: TelegramWebAdminTokenPayload) =>
  Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

export const getTelegramWebAdminBaseUrl = (preferredBaseUrl?: string) => preferredBaseUrl ?? process.env.APP_BASE_URL;

export const createTelegramAdminLoginToken = ({
  chatId,
  nextPath
}: {
  chatId: number | string;
  nextPath?: string;
}) => {
  const payload: TelegramWebAdminTokenPayload = {
    chatId: String(chatId),
    nextPath: sanitizeNextPath(nextPath),
    expiresAt: Date.now() + TELEGRAM_WEB_ADMIN_TTL_MINUTES * 60 * 1000
  };
  const encodedPayload = encodePayload(payload);

  return `${encodedPayload}.${signPayload(encodedPayload)}`;
};

export const verifyTelegramAdminLoginToken = (token?: string) => {
  if (!token) {
    return undefined;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return undefined;
  }

  const expectedSignature = signPayload(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const actualBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
    return undefined;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as TelegramWebAdminTokenPayload;

    if (!payload.chatId || !isAuthorizedTelegramAdminChat(payload.chatId) || payload.expiresAt <= Date.now()) {
      return undefined;
    }

    return {
      chatId: payload.chatId,
      nextPath: sanitizeNextPath(payload.nextPath)
    };
  } catch {
    return undefined;
  }
};

export const createTelegramAdminLoginUrl = ({
  chatId,
  nextPath,
  appBaseUrl
}: {
  chatId: number | string;
  nextPath?: string;
  appBaseUrl?: string;
}) => {
  const resolvedBaseUrl = getTelegramWebAdminBaseUrl(appBaseUrl);

  if (!resolvedBaseUrl) {
    return undefined;
  }

  const loginUrl = new URL("/api/admin/telegram-login", resolvedBaseUrl);
  loginUrl.searchParams.set("token", createTelegramAdminLoginToken({ chatId, nextPath }));
  return loginUrl.toString();
};

export const getTelegramWebAdminTtlMinutes = () => TELEGRAM_WEB_ADMIN_TTL_MINUTES;
