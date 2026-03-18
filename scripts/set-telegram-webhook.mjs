import "./load-env.mjs";

const TELEGRAM_API_BASE = "https://api.telegram.org";

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const appBaseUrl = process.env.APP_BASE_URL;
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!botToken) {
  console.error("Missing TELEGRAM_BOT_TOKEN.");
  process.exit(1);
}

if (!appBaseUrl) {
  console.error("Missing APP_BASE_URL.");
  process.exit(1);
}

const webhookUrl = new URL("/api/telegram/webhook", appBaseUrl).toString();

const payload = {
  url: webhookUrl,
  allowed_updates: ["message", "callback_query"]
};

if (webhookSecret) {
  payload.secret_token = webhookSecret;
}

const response = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/setWebhook`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    accept: "application/json"
  },
  body: JSON.stringify(payload)
});

const result = await response.json();

if (!response.ok || !result.ok) {
  console.error("Could not register Telegram webhook.");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(`Telegram webhook registered: ${webhookUrl}`);
