import "./load-env.mjs";

const TELEGRAM_API_BASE = "https://api.telegram.org";

const botToken = process.env.TELEGRAM_BOT_TOKEN;

if (!botToken) {
  console.error("Missing TELEGRAM_BOT_TOKEN.");
  process.exit(1);
}

const commands = [
  { command: "start", description: "Mo bot quan tri tu xa" },
  { command: "help", description: "Xem danh sach lenh" },
  { command: "dashboard", description: "Tong quan doanh thu hom nay" },
  { command: "pending", description: "Xem don dang cho xac nhan" },
  { command: "orders", description: "Xem 5 don gan nhat" },
  { command: "order", description: "Xem chi tiet don theo ma" },
  { command: "report", description: "Bao cao theo ngay YYYY-MM-DD" },
  { command: "webadmin", description: "Lay link vao trang admin web" }
];

const response = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/setMyCommands`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    accept: "application/json"
  },
  body: JSON.stringify({ commands })
});

const result = await response.json();

if (!response.ok || !result.ok) {
  console.error("Could not register Telegram commands.");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log("Telegram commands registered successfully.");
