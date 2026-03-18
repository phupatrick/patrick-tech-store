import { NextRequest, NextResponse } from "next/server";

import { createAuthSession } from "@/lib/auth";
import { TELEGRAM_BOT_ADMIN_LABEL, verifyTelegramAdminLoginToken } from "@/lib/telegram-web-admin";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? undefined;
  const payload = verifyTelegramAdminLoginToken(token);

  if (!payload) {
    const fallbackUrl = new URL("/admin/login", request.url);
    fallbackUrl.searchParams.set("next", "/admin/products");
    return NextResponse.redirect(fallbackUrl);
  }

  await createAuthSession({
    subject: `telegram-admin:${payload.chatId}`,
    role: "admin",
    label: TELEGRAM_BOT_ADMIN_LABEL,
    tier: "guest",
    points: 0,
    vip: false,
    fixed: true
  });

  return NextResponse.redirect(new URL(payload.nextPath, request.url));
}
