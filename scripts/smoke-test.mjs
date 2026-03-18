import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

const port = Number.parseInt(process.env.SMOKE_PORT ?? "3101", 10);
const baseUrl = `http://127.0.0.1:${port}`;
const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const mojibakePattern = /(?:\u00c3.|\u00c2.|\u00c4.|\u00c6.|\u00e1\u00bb|\u00e1\u00ba|\u00e2\u20ac)/;

const serverLogs = [];

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const startServer = () => {
  const child = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout.on("data", (chunk) => {
    serverLogs.push(chunk.toString());
  });

  child.stderr.on("data", (chunk) => {
    serverLogs.push(chunk.toString());
  });

  return child;
};

const stopServer = async (child) => {
  if (!child || child.killed) {
    return;
  }

  child.kill("SIGTERM");

  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    delay(5000)
  ]);

  if (!child.killed) {
    child.kill("SIGKILL");
  }
};

const waitForServer = async () => {
  let lastError;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(baseUrl, { redirect: "manual" });

      if (response.ok || response.status === 307 || response.status === 308) {
        return;
      }
    } catch (error) {
      lastError = error;
    }

    await delay(1000);
  }

  throw new Error(
    `Server did not become ready on ${baseUrl}. ${lastError instanceof Error ? lastError.message : ""}\n${serverLogs.join("")}`.trim()
  );
};

const fetchText = async (pathname, language = "vi-VN,vi;q=0.9") => {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: {
      "accept-language": language
    }
  });
  const text = await response.text();

  assert(response.ok, `Expected 200 for ${pathname}, received ${response.status}.`);
  assert(!mojibakePattern.test(text), `Detected mojibake text in ${pathname}.`);

  return text;
};

const fetchJson = async (pathname, language = "vi-VN,vi;q=0.9") => {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: {
      "accept-language": language
    }
  });

  assert(response.ok, `Expected 200 for ${pathname}, received ${response.status}.`);

  const payload = await response.json();
  const serialized = JSON.stringify(payload);
  assert(!mojibakePattern.test(serialized), `Detected mojibake text in ${pathname} JSON.`);

  return payload;
};

const fetchJsonResponse = async (pathname, language = "vi-VN,vi;q=0.9", cookie) =>
  fetch(`${baseUrl}${pathname}`, {
    headers: {
      "accept-language": language,
      ...(cookie ? { cookie } : {})
    }
  });

const main = async () => {
  const child = startServer();

  try {
    await waitForServer();

    const home = await fetchText("/");
    assert(home.includes("Patrick Tech Store"), "Homepage does not contain expected brand text.");
    assert(home.includes("Tài khoản số"), "Homepage does not contain expected Vietnamese content.");

    const homeEnglish = await fetchText("/", "en-US,en;q=0.9");
    assert(homeEnglish.includes("Digital accounts"), "English homepage did not switch content.");

    const warranty = await fetchText("/warranty");
    assert(warranty.length > 1000, "Warranty page response is unexpectedly short.");

    const adminLogin = await fetchText("/admin/login");
    assert(adminLogin.includes("Đăng nhập"), "Admin login page did not render expected Vietnamese text.");

    const products = await fetchJson("/api/products?q=chatgpt");
    assert(Array.isArray(products.products), "Products payload is missing products array.");
    assert(products.products.length > 0, "Expected at least one product from /api/products.");
    assert(
      String(products.products[0]?.name ?? "").includes("ChatGPT") ||
        String(products.products[0]?.name ?? "").includes("Claude") ||
        String(products.products[0]?.name ?? "").includes("Gemini"),
      "Unexpected first product name in /api/products."
    );

    const productsEnglish = await fetchJson("/api/products?q=chatgpt", "en-US,en;q=0.9");
    assert(Array.isArray(productsEnglish.products), "English products payload is missing products array.");
    assert(
      String(productsEnglish.products[0]?.name ?? "").includes("year") ||
        String(productsEnglish.products[0]?.name ?? "").includes("month") ||
        String(productsEnglish.products[0]?.shortDescription ?? "").includes("account"),
      "English products payload did not localize expected fields."
    );

    const cookieDrivenProductsResponse = await fetchJsonResponse(
      "/api/products?q=chatgpt",
      "vi-VN,vi;q=0.9",
      "preferred-language=en"
    );
    assert(cookieDrivenProductsResponse.ok, "Cookie-driven /api/products request failed.");
    assert(
      cookieDrivenProductsResponse.headers.get("cache-control")?.includes("no-store"),
      "/api/products is missing the expected no-store cache header."
    );
    const cookieDrivenProducts = await cookieDrivenProductsResponse.json();
    assert(
      String(cookieDrivenProducts.products?.[0]?.name ?? "").includes("year") ||
        String(cookieDrivenProducts.products?.[0]?.shortDescription ?? "").includes("account"),
      "Cookie-driven /api/products response ignored the selected language cookie."
    );

    const googleSheetSyncUnauthorized = await fetch(`${baseUrl}/api/admin/google-sheet/sync`, {
      method: "POST"
    });
    assert(googleSheetSyncUnauthorized.status === 401, "Google Sheet sync route should reject unauthorized requests.");

    console.log(`Smoke test passed on ${baseUrl}. Checked /, /admin/login, /warranty and /api/products in Vietnamese and English.`);
  } finally {
    await stopServer(child);
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);

  if (serverLogs.length > 0) {
    console.error("---- server logs ----");
    console.error(serverLogs.join(""));
  }

  process.exit(1);
});
