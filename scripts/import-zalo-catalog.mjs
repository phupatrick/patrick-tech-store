import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_CATALOG_URL = "https://catalog.zalo.me/?cid=CjB4IZYLbGb1hBDIEvNfUJUdmLPRuE0S9DUwEItYd6PUrhOpKvEJ7m";
const CATALOG_API_BASE = "https://api-catalog.zalo.me/v1";
const ACCOUNT_CATEGORY = "Tài khoản số";
const UPGRADE_CATEGORY = "Nâng cấp gói";
const DIGITAL_ACCOUNT_CATEGORY = "Digital accounts";
const PLAN_UPGRADE_CATEGORY = "Plan upgrades";
const DETAIL_CONCURRENCY = 6;
const FEATURED_PRODUCT_COUNT = 6;
const PRODUCT_FILE_PATH = path.join(process.cwd(), "src", "data", "products.json");

const BRAND_CATEGORIES = [
  {
    pattern: /chatgpt/i,
    vi: ["ChatGPT", "AI"],
    en: ["ChatGPT", "AI"]
  },
  {
    pattern: /claude/i,
    vi: ["Claude", "AI"],
    en: ["Claude", "AI"]
  },
  {
    pattern: /gemini|veo|flow/i,
    vi: ["Gemini", "AI"],
    en: ["Gemini", "AI"]
  },
  {
    pattern: /github|cursor/i,
    vi: ["Lập trình", "Developer"],
    en: ["Developer", "Coding"]
  },
  {
    pattern: /adobe|canva|capcut/i,
    vi: ["Thiết kế", "Sáng tạo"],
    en: ["Design", "Creative"]
  },
  {
    pattern: /microsoft 365/i,
    vi: ["Văn phòng", "Office"],
    en: ["Office", "Productivity"]
  },
  {
    pattern: /netfli/i,
    vi: ["Giải trí", "Streaming"],
    en: ["Entertainment", "Streaming"]
  },
  {
    pattern: /duolingo/i,
    vi: ["Học tập", "Education"],
    en: ["Education", "Learning"]
  },
  {
    pattern: /grok/i,
    vi: ["Grok", "AI"],
    en: ["Grok", "AI"]
  }
];

const normalizeText = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const slugify = (value) =>
  normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const createDedupKey = (name, retailPrice) => `${slugify(name).replace(/-/g, "")}:${retailPrice}`;

const parseCatalogUrl = (input) => {
  if (!input) {
    return new URL(DEFAULT_CATALOG_URL);
  }

  if (/^https?:\/\//i.test(input)) {
    return new URL(input);
  }

  return new URL(`https://catalog.zalo.me/?cid=${encodeURIComponent(input)}`);
};

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      accept: "application/json, text/plain, */*",
      "user-agent": "Mozilla/5.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (typeof data?.error_code === "number" && data.error_code !== 0) {
    throw new Error(`Catalog API error for ${url}: ${data.error_message ?? data.error_code}`);
  }

  return data;
};

const extractPid = (pathValue = "") => new URLSearchParams(pathValue.replace(/^\?/, "")).get("pid") ?? "";

const parseRetailPrice = (rawPrice) => {
  const value = `${rawPrice ?? ""}`.trim();

  if (!value) {
    return 0;
  }

  if (/^free$/i.test(value)) {
    return 0;
  }

  if (/\d+\s*-\s*\d+/i.test(value)) {
    return 0;
  }

  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(value) || /^\d+$/.test(value)) {
    return Number.parseInt(value.replace(/[^\d]/g, ""), 10);
  }

  return 0;
};

const cleanText = (value = "") =>
  value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const formatViDuration = (count, unit) => {
  if (unit === "day") {
    return `${count} ngày`;
  }

  if (unit === "month") {
    return `${count} tháng`;
  }

  if (unit === "year") {
    return `${count} năm`;
  }

  return `${count} ngày`;
};

const formatEnDuration = (count, unit) => `${count} ${unit}${count === 1 ? "" : "s"}`;

const findDurationMatch = (value) => {
  const normalized = normalizeText(value);
  const match = normalized.match(/(\d+)\s*(nam|year|years|thang|month|months|tuan|week|weeks|ngay|day|days)\b/);

  if (!match) {
    return undefined;
  }

  const count = Number.parseInt(match[1], 10);
  const rawUnit = match[2];

  if (!Number.isFinite(count) || count <= 0) {
    return undefined;
  }

  if (["nam", "year", "years"].includes(rawUnit)) {
    return { count, unit: "year" };
  }

  if (["thang", "month", "months"].includes(rawUnit)) {
    return { count, unit: "month" };
  }

  if (["tuan", "week", "weeks"].includes(rawUnit)) {
    return { count: count * 7, unit: "day" };
  }

  return { count, unit: "day" };
};

const inferUsageDuration = (name, description) => {
  const directMatch = findDurationMatch(name) ?? findDurationMatch(description);
  return directMatch ? formatViDuration(directMatch.count, directMatch.unit) : "30 ngày";
};

const inferWarrantyMonths = (description, usageDuration) => {
  const normalized = normalizeText(description);
  const warrantySegment =
    normalized.match(/bao hanh(?: full)?\s*(\d+)\s*(nam|thang|tuan|ngay)/) ??
    normalized.match(/bao hanh\s*(\d+)\s*(nam|thang|tuan|ngay)/);

  if (warrantySegment) {
    const count = Number.parseInt(warrantySegment[1], 10);
    const unit = warrantySegment[2];

    if (unit === "nam") {
      return count * 12;
    }

    if (unit === "thang") {
      return count;
    }

    if (unit === "tuan") {
      return Math.max(1, Math.ceil((count * 7) / 30));
    }

    return Math.max(1, Math.ceil(count / 30));
  }

  const usageMatch = findDurationMatch(usageDuration);

  if (usageMatch?.unit === "year") {
    return usageMatch.count * 12;
  }

  if (usageMatch?.unit === "month") {
    return Math.max(1, usageMatch.count);
  }

  return 1;
};

const inferAccountType = (name, description) => {
  const haystack = normalizeText(`${name} ${description}`);

  if (
    haystack.includes("dung chung") ||
    haystack.includes("shared") ||
    haystack.includes("sharing") ||
    haystack.includes("thue")
  ) {
    return "rental";
  }

  if (
    haystack.includes("cap rieng") ||
    haystack.includes("acc cap") ||
    haystack.includes("tai khoan cap") ||
    haystack.includes("issued account")
  ) {
    return "dedicated";
  }

  return "primary";
};

const inferTopCategory = (name) => {
  const haystack = normalizeText(name);
  return haystack.includes("nang cap") || haystack.includes("upgrade") ? UPGRADE_CATEGORY : ACCOUNT_CATEGORY;
};

const translateTopCategory = (category) => (category === UPGRADE_CATEGORY ? PLAN_UPGRADE_CATEGORY : DIGITAL_ACCOUNT_CATEGORY);

const inferCategories = (name) => {
  const categories = [inferTopCategory(name)];

  BRAND_CATEGORIES.forEach((entry) => {
    if (entry.pattern.test(name)) {
      entry.vi.forEach((category) => {
        if (!categories.includes(category)) {
          categories.push(category);
        }
      });
    }
  });

  if (categories.length === 1) {
    categories.push("Khác");
  }

  return categories;
};

const translateCategories = (categories, name) => {
  const translated = [translateTopCategory(categories[0] ?? ACCOUNT_CATEGORY)];

  BRAND_CATEGORIES.forEach((entry) => {
    if (entry.pattern.test(name)) {
      entry.en.forEach((category) => {
        if (!translated.includes(category)) {
          translated.push(category);
        }
      });
    }
  });

  if (translated.length === 1) {
    translated.push("Other");
  }

  return translated;
};

const cleanProductName = (value) => value.replace(/\[HOT\]\s*/gi, "").replace(/\s{2,}/g, " ").trim();

const translateProductName = (value) => {
  let result = cleanProductName(value);

  result = result.replace(/Tài khoản khác\.?/gi, "Custom account request");
  result = result.replace(/chính chủ/gi, "primary account");
  result = result.replace(/acc cấp riêng/gi, "dedicated account");
  result = result.replace(/acc cấp/gi, "issued account");
  result = result.replace(/add family/gi, "family slot");
  result = result.replace(/mỗi tháng/gi, "per month");
  result = result.replace(/miễn phí/gi, "free");
  result = result.replace(/(\d+)\s*năm/gi, (_, count) => formatEnDuration(Number.parseInt(count, 10), "year"));
  result = result.replace(/(\d+)\s*tháng/gi, (_, count) => formatEnDuration(Number.parseInt(count, 10), "month"));
  result = result.replace(/(\d+)\s*ngày/gi, (_, count) => formatEnDuration(Number.parseInt(count, 10), "day"));
  result = result.replace(/(\d+)\s*tuần/gi, (_, count) => formatEnDuration(Number.parseInt(count, 10), "week"));
  result = result.replace(/credit/gi, "credits");

  if (/\[HOT\]/i.test(value)) {
    result = `Hot ${result}`;
  }

  return result;
};

const buildViShortDescription = ({ name, usageDuration, warrantyMonths, accountType, retailPrice }) => {
  const accountLabel =
    accountType === "dedicated"
      ? "Tài khoản cấp riêng"
      : accountType === "rental"
        ? "Tài khoản thuê"
        : "Tài khoản chính chủ";
  const warrantyText = warrantyMonths >= 12 ? `${Math.round(warrantyMonths / 12)} năm` : `${warrantyMonths} tháng`;
  const priceNote = retailPrice > 0 ? "" : " Liên hệ để nhận báo giá chi tiết.";

  return `${cleanProductName(name)} dạng ${accountLabel.toLowerCase()}, thời hạn ${usageDuration}, bảo hành ${warrantyText}.${priceNote}`;
};

const buildEnShortDescription = ({ name, usageDuration, warrantyMonths, accountType, retailPrice }) => {
  const usageMatch = findDurationMatch(usageDuration) ?? { count: 30, unit: "day" };
  const usageText = formatEnDuration(usageMatch.count, usageMatch.unit);
  const accountLabel =
    accountType === "dedicated" ? "dedicated account" : accountType === "rental" ? "rental account" : "primary account";
  const warrantyText =
    warrantyMonths >= 12
      ? formatEnDuration(Math.round(warrantyMonths / 12), "year")
      : formatEnDuration(Math.max(1, warrantyMonths), "month");
  const priceNote = retailPrice > 0 ? "" : " Contact us for a custom quote.";

  return `${translateProductName(name)} with ${accountLabel} delivery, ${usageText} of use, and ${warrantyText} warranty.${priceNote}`;
};

const buildViFullDescription = ({ description, shortDescription, retailPrice }) => {
  if (description) {
    return cleanText(description);
  }

  return retailPrice > 0
    ? `${shortDescription}\n\nThông tin được đồng bộ từ catalog Zalo của cửa hàng.`
    : `${shortDescription}\n\nGiá trong catalog Zalo đang để trống hoặc là khoảng giá, vui lòng liên hệ để được báo giá chính xác.`;
};

const buildEnFullDescription = ({ name, shortDescription, usageDuration, warrantyMonths, accountType, retailPrice }) => {
  const accountLabel =
    accountType === "dedicated" ? "Dedicated account" : accountType === "rental" ? "Rental account" : "Primary account";
  const usageMatch = findDurationMatch(usageDuration) ?? { count: 30, unit: "day" };
  const usageText = formatEnDuration(usageMatch.count, usageMatch.unit);
  const warrantyText =
    warrantyMonths >= 12
      ? formatEnDuration(Math.round(warrantyMonths / 12), "year")
      : formatEnDuration(Math.max(1, warrantyMonths), "month");
  const priceLine =
    retailPrice > 0
      ? "Retail pricing is synced from the official Zalo catalog."
      : "The Zalo catalog shows either a custom quote or no fixed price for this item.";

  return [
    shortDescription,
    `${accountLabel}. Usage term: ${usageText}. Warranty: ${warrantyText}.`,
    `${translateProductName(name)} was imported from the store's Zalo catalog listing.`,
    `${priceLine} Contact support for the latest delivery details before checkout.`
  ].join("\n\n");
};

const mapProduct = (entry, index) => {
  const pid = extractPid(entry.path);
  const name = cleanProductName(entry.name || "Sản phẩm Zalo");
  const description = cleanText(entry.description || "");
  const usageDuration = inferUsageDuration(name, description);
  const warrantyMonths = inferWarrantyMonths(description, usageDuration);
  const accountType = inferAccountType(name, description);
  const retailPrice = parseRetailPrice(entry.strPrice);
  const shortDescription = buildViShortDescription({
    name,
    usageDuration,
    warrantyMonths,
    accountType,
    retailPrice
  });
  const fullDescription = buildViFullDescription({
    description,
    shortDescription,
    retailPrice
  });
  const categories = inferCategories(name);
  const enCategories = translateCategories(categories, name);
  const flashSale = /\[HOT\]/i.test(entry.name || "");
  const createdAt = new Date(Date.UTC(2026, 2, 14, 0, index, 0)).toISOString();
  const updatedAt = new Date(Date.UTC(2026, 2, 14, 0, index, 30)).toISOString();

  return {
    id: `zalo-${pid}`,
    name,
    slug: `${slugify(name)}-${pid.slice(0, 8)}`,
    shortDescription,
    fullDescription,
    usageDuration,
    costPrice: retailPrice,
    retailPrice,
    customerTierPrices: {
      regular: retailPrice,
      vip: retailPrice
    },
    category: categories[0],
    categories,
    accountType,
    featured: index < FEATURED_PRODUCT_COUNT,
    isFlashSale: flashSale,
    flashSaleLabel: flashSale ? "Nổi bật" : undefined,
    published: true,
    tierPrices: {
      regular: retailPrice,
      vip: retailPrice
    },
    overridePrices: {},
    image: entry.productPhotos?.[0] || entry.photos?.[0] || "",
    warrantyMonths,
    stock: 0,
    points: 0,
    createdAt,
    updatedAt,
    translations: {
      vi: {
        name,
        shortDescription,
        fullDescription,
        category: categories[0],
        categories,
        flashSaleLabel: flashSale ? "Nổi bật" : undefined
      },
      en: {
        name: translateProductName(entry.name || name),
        shortDescription: buildEnShortDescription({
          name,
          usageDuration,
          warrantyMonths,
          accountType,
          retailPrice
        }),
        fullDescription: buildEnFullDescription({
          name,
          shortDescription: buildEnShortDescription({
            name,
            usageDuration,
            warrantyMonths,
            accountType,
            retailPrice
          }),
          usageDuration,
          warrantyMonths,
          accountType,
          retailPrice
        }),
        category: enCategories[0],
        categories: enCategories,
        flashSaleLabel: flashSale ? "Hot" : undefined
      }
    }
  };
};

const mapWithConcurrency = async (items, limit, mapper) => {
  const results = new Array(items.length);
  let currentIndex = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (currentIndex < items.length) {
      const index = currentIndex;
      currentIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
};

const fetchCatalogProducts = async (catalogId) => {
  const items = [];
  let total = Number.POSITIVE_INFINITY;
  let lastId = 0;

  while (items.length < total) {
    const url = `${CATALOG_API_BASE}/catalog?noise=${encodeURIComponent(catalogId)}&limit=20&lastId=${lastId}`;
    const response = await fetchJson(url);
    const pageItems = response.data?.category_product ?? [];
    total = response.data?.total ?? pageItems.length;

    if (pageItems.length === 0) {
      break;
    }

    items.push(...pageItems);
    lastId = Math.min(...pageItems.map((item) => item.id));
  }

  const seen = new Set();
  return items.filter((item) => {
    const pid = extractPid(item.path);

    if (!pid || seen.has(pid)) {
      return false;
    }

    seen.add(pid);
    return true;
  });
};

const fetchProductDetail = async (item) => {
  const pid = extractPid(item.path);

  if (!pid) {
    return { ...item, pid, description: "" };
  }

  try {
    const response = await fetchJson(`${CATALOG_API_BASE}/product?productId=${encodeURIComponent(pid)}`);
    const info = response.data?.product_info ?? {};

    return {
      ...item,
      pid,
      name: info.name || item.name,
      description: info.description || "",
      productPhotos: info.productPhotos || item.photos || [],
      ownerDisplayName: info.ownerDisplayName || ""
    };
  } catch (error) {
    console.warn(`Detail fetch failed for ${pid}: ${error instanceof Error ? error.message : String(error)}`);
    return {
      ...item,
      pid,
      description: "",
      productPhotos: item.photos || [],
      ownerDisplayName: ""
    };
  }
};

const readExistingProducts = async () => {
  try {
    const content = await readFile(PRODUCT_FILE_PATH, "utf8");
    return JSON.parse(content);
  } catch {
    return [];
  }
};

const main = async () => {
  const catalogUrl = parseCatalogUrl(process.argv[2]);
  const catalogId = catalogUrl.searchParams.get("cid");

  if (!catalogId) {
    throw new Error("Missing Zalo catalog cid.");
  }

  console.log(`Fetching Zalo catalog ${catalogId}...`);
  const catalogItems = await fetchCatalogProducts(catalogId);
  console.log(`Found ${catalogItems.length} products in the Zalo catalog.`);

  const detailedItems = await mapWithConcurrency(catalogItems, DETAIL_CONCURRENCY, fetchProductDetail);
  const importedProducts = detailedItems.map(mapProduct);
  const existingProducts = await readExistingProducts();
  const importedKeys = new Set(importedProducts.map((product) => createDedupKey(product.name, product.retailPrice)));
  const preservedProducts = existingProducts.filter((product) => {
    if (typeof product?.id !== "string" || product.id.startsWith("zalo-")) {
      return false;
    }

    return !importedKeys.has(createDedupKey(product.name ?? "", Number(product.retailPrice) || 0));
  });
  const nextProducts = [...preservedProducts, ...importedProducts];

  await writeFile(PRODUCT_FILE_PATH, JSON.stringify(nextProducts, null, 2), "utf8");

  const zeroPriceCount = importedProducts.filter((product) => product.retailPrice <= 0).length;
  console.log(
    `Imported ${importedProducts.length} Zalo products (${preservedProducts.length} existing custom products preserved, ${zeroPriceCount} items with custom or empty pricing).`
  );
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
