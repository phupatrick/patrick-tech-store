import "./load-env.mjs";

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseCsv } from "csv-parse/sync";
import { google } from "googleapis";

const PRODUCT_FILE_PATH = path.join(process.cwd(), "src", "data", "products.json");
export const PRODUCT_SHEET_NAME = process.env.GOOGLE_SHEET_TAB_NAME ?? "Products";
export const PRODUCT_SHEET_GID = process.env.GOOGLE_SHEET_GID?.trim() ?? "0";
const GOOGLE_SHEET_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file"
];
const MOJIBAKE_PATTERN = /(?:\u00c3.|\u00c2.|\u00c4.|\u00c6.|\u00e1\u00bb|\u00e1\u00ba|\u00e2\u20ac)/;

const PRODUCT_SHEET_COLUMNS = [
  { key: "name", label: "T\u00ean s\u1ea3n ph\u1ea9m" },
  { key: "imagePreview", label: "\u1ea2nh" },
  { key: "shortDescription", label: "M\u00f4 t\u1ea3 ng\u1eafn" },
  { key: "fullDescription", label: "M\u00f4 t\u1ea3 chi ti\u1ebft" },
  { key: "usageDurationValue", label: "Th\u1eddi gian s\u1eed d\u1ee5ng s\u1ed1" },
  { key: "usageDurationUnit", label: "Th\u1eddi gian s\u1eed d\u1ee5ng \u0111\u01a1n v\u1ecb" },
  { key: "warrantyMonths", label: "B\u1ea3o h\u00e0nh th\u00e1ng" },
  { key: "costPrice", label: "Gi\u00e1 v\u1ed1n" },
  { key: "retailPrice", label: "Gi\u00e1 b\u00e1n l\u1ebb" },
  { key: "customerRegularPrice", label: "Gi\u00e1 kh\u00e1ch th\u01b0\u1eddng" },
  { key: "customerVipPrice", label: "Gi\u00e1 kh\u00e1ch VIP" },
  { key: "ctvRegularPrice", label: "Gi\u00e1 CTV th\u01b0\u1eddng" },
  { key: "ctvVipPrice", label: "Gi\u00e1 CTV VIP" },
  { key: "category", label: "Danh m\u1ee5c ch\u00ednh" },
  { key: "categories", label: "Danh m\u1ee5c" },
  { key: "accountType", label: "Lo\u1ea1i t\u00e0i kho\u1ea3n" },
  { key: "featured", label: "N\u1ed5i b\u1eadt" },
  { key: "isFlashSale", label: "Flash sale" },
  { key: "flashSaleLabel", label: "Nh\u00e3n flash sale" },
  { key: "published", label: "Hi\u1ec3n th\u1ecb" },
  { key: "points", label: "\u0110i\u1ec3m" },
  { key: "id", label: "M\u00e3 s\u1ea3n ph\u1ea9m" },
  { key: "slug", label: "Slug" },
  { key: "image", label: "Link \u1ea3nh" },
  { key: "enName", label: "T\u00ean ti\u1ebfng Anh" },
  { key: "enShortDescription", label: "M\u00f4 t\u1ea3 ng\u1eafn ti\u1ebfng Anh" },
  { key: "enFullDescription", label: "M\u00f4 t\u1ea3 chi ti\u1ebft ti\u1ebfng Anh" },
  { key: "enCategory", label: "Danh m\u1ee5c ch\u00ednh ti\u1ebfng Anh" },
  { key: "enCategories", label: "Danh m\u1ee5c ti\u1ebfng Anh" },
  { key: "enFlashSaleLabel", label: "Nh\u00e3n flash sale ti\u1ebfng Anh" }
];

export const PRODUCT_SHEET_HEADERS = PRODUCT_SHEET_COLUMNS.map((column) => column.label);

const getSpreadsheetColumnLabel = (index) => {
  let value = index + 1;
  let label = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }

  return label;
};

export const PRODUCT_SHEET_RANGE = `${PRODUCT_SHEET_NAME}!A:${getSpreadsheetColumnLabel(PRODUCT_SHEET_HEADERS.length - 1)}`;

const normalizeText = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const countMojibakeTokens = (value = "") => {
  const matches = String(value).match(MOJIBAKE_PATTERN);
  return matches ? matches.length : 0;
};

const repairMojibakeText = (value = "") => {
  let repaired = String(value ?? "");

  if (!MOJIBAKE_PATTERN.test(repaired)) {
    return repaired;
  }

  for (let pass = 0; pass < 2; pass += 1) {
    const candidate = Buffer.from(repaired, "latin1").toString("utf8");

    if (candidate.includes("\ufffd")) {
      break;
    }

    if (countMojibakeTokens(candidate) >= countMojibakeTokens(repaired)) {
      break;
    }

    repaired = candidate;

    if (!MOJIBAKE_PATTERN.test(repaired)) {
      break;
    }
  }

  return repaired;
};

const sanitizeSheetText = (value = "") => repairMojibakeText(String(value ?? "").trim());

const restoreMultilineSheetText = (value = "") => sanitizeSheetText(value).replace(/ \| /g, "\n");

const PRODUCT_SHEET_HEADER_KEY_MAP = new Map(
  PRODUCT_SHEET_COLUMNS.flatMap((column) => [
    [normalizeText(column.key), column.key],
    [normalizeText(column.label), column.key]
  ])
);

PRODUCT_SHEET_HEADER_KEY_MAP.set(normalizeText("Xem ảnh"), "imagePreview");
PRODUCT_SHEET_HEADER_KEY_MAP.set(normalizeText("Xem trước ảnh"), "imagePreview");

const resolveSheetHeaderKey = (header = "") => PRODUCT_SHEET_HEADER_KEY_MAP.get(normalizeText(sanitizeSheetText(header))) ?? sanitizeSheetText(header);

const slugify = (value) =>
  normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const splitCategories = (value = "") =>
  value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeCategoryList = (value) => {
  const source = Array.isArray(value) ? value.map((item) => sanitizeSheetText(item)) : splitCategories(sanitizeSheetText(value));
  const uniqueCategories = new Map();

  source.forEach((category) => {
    const normalized = normalizeText(category);

    if (normalized && !uniqueCategories.has(normalized)) {
      uniqueCategories.set(normalized, category.trim());
    }
  });

  return Array.from(uniqueCategories.values());
};

const parseUsageDuration = (value = "") => {
  const trimmed = sanitizeSheetText(value);
  const matchedValue = trimmed.match(/\d+/)?.[0] ?? "30";
  const normalized = normalizeText(trimmed);
  const unit = normalized.includes("thang") || normalized.includes("month") ? "month" : "day";

  return {
    value: matchedValue,
    unit
  };
};

const formatUsageDuration = (value, unit) => `${String(value).trim()} ${unit === "month" ? "thang" : "ngay"}`;

const parseBooleanCell = (value, fallback = false) => {
  const normalized = normalizeText(sanitizeSheetText(value));

  if (!normalized) {
    return fallback;
  }

  return ["true", "1", "yes", "y", "co", "on"].includes(normalized);
};

const parseMoneyCell = (value, fallback = 0) => {
  const normalizedValue = sanitizeSheetText(value);

  if (!normalizedValue) {
    return fallback;
  }

  const digits = normalizedValue.replace(/[^\d.-]/g, "");
  const parsedValue = Number.parseFloat(digits);

  return Number.isFinite(parsedValue) && parsedValue >= 0 ? Math.round(parsedValue) : fallback;
};

const parseIntegerCell = (value, fallback = 0) => {
  const parsedValue = Number.parseInt(sanitizeSheetText(value), 10);
  return Number.isInteger(parsedValue) && parsedValue >= 0 ? parsedValue : fallback;
};

const dedupeProducts = (products) => {
  const uniqueProducts = new Map();

  for (const product of products) {
    const key = sanitizeSheetText(product.id) || sanitizeSheetText(product.slug);

    if (!key) {
      continue;
    }

    uniqueProducts.set(key, product);
  }

  return Array.from(uniqueProducts.values());
};

const hasGoogleServiceAccountCredentials = () =>
  Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() || process.env.GOOGLE_SERVICE_ACCOUNT_FILE?.trim());

const getGoogleServiceAccountCredentials = async () => {
  const inlineCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();

  if (inlineCredentials) {
    return JSON.parse(inlineCredentials);
  }

  const credentialsFile = process.env.GOOGLE_SERVICE_ACCOUNT_FILE?.trim();

  if (!credentialsFile) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_FILE.");
  }

  const content = await readFile(path.resolve(process.cwd(), credentialsFile), "utf8");
  return JSON.parse(content);
};

export const createGoogleClients = async () => {
  const credentials = await getGoogleServiceAccountCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: GOOGLE_SHEET_SCOPES
  });
  const authClient = await auth.getClient();

  return {
    sheets: google.sheets({ version: "v4", auth: authClient }),
    drive: google.drive({ version: "v3", auth: authClient })
  };
};

export const readProductsFile = async () => {
  const content = await readFile(PRODUCT_FILE_PATH, "utf8");
  return JSON.parse(content);
};

export const writeProductsFile = async (products) => {
  await writeFile(PRODUCT_FILE_PATH, JSON.stringify(products, null, 2), "utf8");
};

const boolToSheetCell = (value) => (value ? "TRUE" : "FALSE");

const getEnglishTranslation = (product, key) => product.translations?.en?.[key] ?? "";
const SHEET_IMAGE_PROXY_URL = "https://wsrv.nl/?url=";

const toSheetRow = (product, rowIndex) => {
  const usageDuration = parseUsageDuration(product.usageDuration ?? "");
  const imageColumn = PRODUCT_SHEET_COLUMNS.findIndex((column) => column.key === "image");
  const rowNumber = rowIndex + 2;
  const imageCellRef = `${getSpreadsheetColumnLabel(imageColumn)}${rowNumber}`;
  const imagePreviewValue = product.image?.trim()
    ? `=IF(${imageCellRef}="";"";IMAGE("${SHEET_IMAGE_PROXY_URL}"&ENCODEURL(${imageCellRef})))`
    : "";

  return [
    product.name ?? "",
    imagePreviewValue,
    product.shortDescription ?? "",
    product.fullDescription ?? "",
    usageDuration.value,
    usageDuration.unit,
    String(product.warrantyMonths ?? 0),
    String(product.costPrice ?? 0),
    String(product.retailPrice ?? 0),
    String(product.customerTierPrices?.regular ?? product.retailPrice ?? 0),
    String(product.customerTierPrices?.vip ?? product.customerTierPrices?.regular ?? product.retailPrice ?? 0),
    String(product.tierPrices?.regular ?? product.retailPrice ?? 0),
    String(product.tierPrices?.vip ?? product.tierPrices?.regular ?? product.retailPrice ?? 0),
    product.category ?? "",
    (product.categories ?? []).join(", "),
    product.accountType ?? "primary",
    boolToSheetCell(Boolean(product.featured)),
    boolToSheetCell(Boolean(product.isFlashSale)),
    product.flashSaleLabel ?? "",
    boolToSheetCell(Boolean(product.published)),
    String(product.points ?? 0),
    product.id ?? "",
    product.slug ?? "",
    product.image ?? "",
    getEnglishTranslation(product, "name"),
    getEnglishTranslation(product, "shortDescription"),
    getEnglishTranslation(product, "fullDescription"),
    getEnglishTranslation(product, "category"),
    (product.translations?.en?.categories ?? []).join(", "),
    getEnglishTranslation(product, "flashSaleLabel")
  ];
};

export const buildTemplateRowsFromProducts = async () => {
  const products = await readProductsFile();
  return [PRODUCT_SHEET_HEADERS, ...products.map((product, index) => toSheetRow(product, index))];
};

export const buildProductFromSheetRow = (row) => {
  const usageDurationValue = sanitizeSheetText(row.usageDurationValue) || "30";
  const usageDurationUnit = normalizeText(sanitizeSheetText(row.usageDurationUnit)).includes("month") ? "month" : "day";
  const retailPrice = parseMoneyCell(row.retailPrice, 0);
  const customerRegularPrice = parseMoneyCell(row.customerRegularPrice, retailPrice);
  const customerVipPrice = parseMoneyCell(row.customerVipPrice, customerRegularPrice);
  const ctvRegularPrice = parseMoneyCell(row.ctvRegularPrice, customerRegularPrice);
  const ctvVipPrice = parseMoneyCell(row.ctvVipPrice, ctvRegularPrice);
  const categories = normalizeCategoryList(row.categories || row.category);
  const name = sanitizeSheetText(row.name);
  const slug = sanitizeSheetText(row.slug) || slugify(name);
  const englishCategories = normalizeCategoryList(row.enCategories || row.enCategory);
  const englishName = sanitizeSheetText(row.enName);
  const englishShortDescription = sanitizeSheetText(row.enShortDescription);
  const englishFullDescription = restoreMultilineSheetText(row.enFullDescription);
  const englishCategory = sanitizeSheetText(row.enCategory);
  const englishFlashSaleLabel = sanitizeSheetText(row.enFlashSaleLabel);
  const englishTranslations =
    englishName || englishShortDescription || englishFullDescription || englishCategory || englishCategories.length > 0 || englishFlashSaleLabel
      ? {
          name: englishName || undefined,
          shortDescription: englishShortDescription || undefined,
          fullDescription: englishFullDescription || undefined,
          category: englishCategory || undefined,
          categories: englishCategories.length > 0 ? englishCategories : undefined,
          flashSaleLabel: englishFlashSaleLabel || undefined
        }
      : undefined;

  return {
    id: sanitizeSheetText(row.id) || `sheet-${slug}`,
    slug,
    name,
    shortDescription: sanitizeSheetText(row.shortDescription),
    fullDescription: restoreMultilineSheetText(row.fullDescription),
    usageDuration: formatUsageDuration(usageDurationValue, usageDurationUnit),
    costPrice: parseMoneyCell(row.costPrice, retailPrice),
    retailPrice,
    customerTierPrices: {
      regular: customerRegularPrice,
      vip: customerVipPrice
    },
    category: sanitizeSheetText(row.category) || categories[0] || undefined,
    categories,
    accountType: ["dedicated", "primary", "rental"].includes(sanitizeSheetText(row.accountType))
      ? sanitizeSheetText(row.accountType)
      : "primary",
    featured: parseBooleanCell(row.featured, false),
    isFlashSale: parseBooleanCell(row.isFlashSale, false),
    flashSaleLabel: sanitizeSheetText(row.flashSaleLabel) || undefined,
    published: parseBooleanCell(row.published, true),
    tierPrices: {
      regular: ctvRegularPrice,
      vip: ctvVipPrice
    },
    overridePrices: {},
    image: sanitizeSheetText(row.image),
    warrantyMonths: parseIntegerCell(row.warrantyMonths, 0),
    stock: 0,
    points: parseIntegerCell(row.points, 0),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    translations: englishTranslations
      ? {
          en: englishTranslations
        }
      : undefined
  };
};

export const rowsToObjects = (values) => {
  if (!values?.length) {
    return [];
  }

  const [headerRow, ...dataRows] = values;
  const headers = headerRow.map((header) => resolveSheetHeaderKey(String(header ?? "")));

  return dataRows
    .map((row) => {
      const object = {};
      headers.forEach((header, index) => {
        const value = row[index] ?? "";
        object[header] = typeof value === "string" ? repairMojibakeText(value) : value;
      });
      return object;
    })
    .filter((row) => sanitizeSheetText(row.name));
};

const parsePublicSheetCsv = (csvContent) =>
  parseCsv(csvContent, {
    bom: true,
    columns: (header) => header.map((item) => resolveSheetHeaderKey(item)),
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true
  })
    .map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
          key,
          typeof value === "string" ? repairMojibakeText(value) : value
        ])
      )
    )
    .filter((row) => sanitizeSheetText(row.name));

const readProductsFromPublicGoogleSheet = async (spreadsheetId) => {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${PRODUCT_SHEET_GID}`;
  const response = await fetch(csvUrl, {
    headers: {
      "user-agent": "patrick-tech-store-sheet-sync/1.0"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to read public Google Sheet CSV (${response.status}).`);
  }

  const csvContent = await response.text();
  const rows = parsePublicSheetCsv(csvContent);
  return dedupeProducts(rows.map(buildProductFromSheetRow));
};

export const readProductsFromGoogleSheet = async (spreadsheetId) => {
  if (hasGoogleServiceAccountCredentials()) {
    try {
      const { sheets } = await createGoogleClients();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: PRODUCT_SHEET_RANGE
      });
      const rows = rowsToObjects(response.data.values ?? []);
      return dedupeProducts(rows.map(buildProductFromSheetRow));
    } catch (error) {
      if (process.env.GOOGLE_SHEET_DISABLE_PUBLIC_FALLBACK === "true") {
        throw error;
      }
    }
  }

  return readProductsFromPublicGoogleSheet(spreadsheetId);
};

export const DEFAULT_SHARED_EDITORS = [
  "hphumail@gmail.com",
  "hoangphupatrick@gmail.com",
  "phupunpin@gmail.com"
];
