import { NextRequest, NextResponse } from "next/server";

import { handleTelegramAdminUpdate } from "@/lib/telegram-admin-bot";
import { getTelegramConfig } from "@/lib/telegram";

const isAuthorizedWebhook = (request: NextRequest) => {
  const { webhookSecret } = getTelegramConfig();

  if (!webhookSecret) {
    return true;
  }

  return request.headers.get("x-telegram-bot-api-secret-token") === webhookSecret;
};

export async function POST(request: NextRequest) {
  if (!isAuthorizedWebhook(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const update = await request.json();
  await handleTelegramAdminUpdate(update, { appBaseUrl: request.nextUrl.origin });

  return NextResponse.json({ ok: true });
}
