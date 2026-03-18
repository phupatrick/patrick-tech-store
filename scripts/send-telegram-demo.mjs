import "./load-env.mjs";

const TELEGRAM_API_BASE = "https://api.telegram.org";

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const merchantChatId = process.env.TELEGRAM_MERCHANT_CHAT_ID;
const adminChatIds = (process.env.TELEGRAM_ADMIN_CHAT_IDS ?? "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const chatId = merchantChatId ?? adminChatIds[0];
const text =
  process.env.TELEGRAM_DEMO_TEXT ??
  "Patrick Tech Store test message\nBot admin remote control is ready to connect.";

if (!botToken || !chatId) {
  console.error("Missing TELEGRAM_BOT_TOKEN and target chat id.");
  console.error("Set TELEGRAM_MERCHANT_CHAT_ID or TELEGRAM_ADMIN_CHAT_IDS before running.");
  process.exit(1);
}

const response = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    accept: "application/json"
  },
  body: JSON.stringify({
    chat_id: chatId,
    text
  })
});

const result = await response.json();

if (!response.ok || !result.ok) {
  console.error("Could not send Telegram demo message.");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(`Telegram demo sent successfully to ${chatId}.`);
