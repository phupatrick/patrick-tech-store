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
const DEFAULT_USD_PER_VND = 0.000038;

const PRODUCT_SHEET_COLUMNS = [
  { key: "id", label: "M\u00e3 s\u1ea3n ph\u1ea9m" },
  { key: "image", label: "H\u00ecnh \u1ea3nh" },
  { key: "name", label: "T\u00ean s\u1ea3n ph\u1ea9m" },
  { key: "usageDuration", label: "Th\u1eddi gian s\u1eed d\u1ee5ng" },
  { key: "warrantyDuration", label: "Th\u1eddi gian b\u1ea3o h\u00e0nh" },
  { key: "accountType", label: "Lo\u1ea1i acc" },
  { key: "costPrice", label: "Gi\u00e1 v\u1ed1n" },
  { key: "customerPriceVnd", label: "Gi\u00e1 kh\u00e1ch (VND)" },
  { key: "ctvPriceVnd", label: "Gi\u00e1 CTV (VND)" },
  { key: "customerPriceUsd", label: "Gi\u00e1 kh\u00e1ch (USD)" },
  { key: "ctvPriceUsd", label: "Gi\u00e1 CTV (USD)" },
  { key: "shortDescription", label: "M\u00f4 t\u1ea3 ng\u1eafn" },
  { key: "fullDescription", label: "M\u00f4 t\u1ea3 chi ti\u1ebft" },
  { key: "published", label: "C\u00f2n h\u00e0ng (y/n)" }
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

[
  ["anh", "image"],
  ["link anh", "image"],
  ["xem anh", "image"],
  ["xem truoc anh", "image"],
  ["gia ban le", "customerPriceVnd"],
  ["gia khach thuong", "customerPriceVnd"],
  ["gia khach vip", "customerPriceVnd"],
  ["gia ctv thuong", "ctvPriceVnd"],
  ["gia ctv vip", "ctvPriceVnd"],
  ["so dung", "usageDurationValue"],
  ["don vi dung", "usageDurationUnit"],
  ["bao hanh thang", "warrantyMonths"],
  ["hien thi", "published"],
  ["con hang", "published"],
  ["loai tai khoan", "accountType"],
  ["danh muc chinh", "category"],
  ["danh muc", "categories"],
  ["ten tieng anh", "enName"],
  ["mo ta ngan tieng anh", "enShortDescription"],
  ["mo ta chi tiet tieng anh", "enFullDescription"],
  ["danh muc chinh tieng anh", "enCategory"],
  ["danh muc tieng anh", "enCategories"],
  ["nhan flash sale", "flashSaleLabel"],
  ["nhan flash sale tieng anh", "enFlashSaleLabel"],
  ["flash sale", "isFlashSale"],
  ["noi bat", "featured"],
  ["diem", "points"]
].forEach(([alias, key]) => {
  PRODUCT_SHEET_HEADER_KEY_MAP.set(normalizeText(alias), key);
});

const resolveSheetHeaderKey = (header = "") =>
  PRODUCT_SHEET_HEADER_KEY_MAP.get(normalizeText(sanitizeSheetText(header))) ?? sanitizeSheetText(header);

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

const parseDurationValue = (value = "", fallbackValue = "1", fallbackUnit = "month") => {
  const trimmed = sanitizeSheetText(value);
  const matchedValue = trimmed.match(/\d+/)?.[0] ?? fallbackValue;
  const normalized = normalizeText(trimmed);
  const unit = normalized.includes("nam") || normalized.includes("year")
    ? "year"
    : normalized.includes("thang") || normalized.includes("month")
      ? "month"
      : normalized.includes("ngay") || normalized.includes("day")
        ? "day"
        : fallbackUnit;

  return {
    value: matchedValue,
    unit
  };
};

const formatDurationForStorage = (value, unit) => `${String(value).trim()} ${unit}`;

const formatDurationForSheet = (value = "", fallbackValue = "1", fallbackUnit = "month") => {
  const parsed = parseDurationValue(value, fallbackValue, fallbackUnit);

  if (parsed.unit === "year") {
    return `${parsed.value} n\u0103m`;
  }

  if (parsed.unit === "month") {
    return `${parsed.value} th\u00e1ng`;
  }

  return `${parsed.value} ng\u00e0y`;
};

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

  return Number.isFinite(parsedValue) && parsedValue >= 0 ? Math.round(parsedValue * 100) / 100 : fallback;
};

const parseIntegerCell = (value, fallback = 0) => {
  const parsedValue = Number.parseInt(sanitizeSheetText(value), 10);
  return Number.isInteger(parsedValue) && parsedValue >= 0 ? parsedValue : fallback;
};

const parseAccountTypeCell = (value = "", fallback = "primary") => {
  const normalized = normalizeText(sanitizeSheetText(value));

  if (normalized.includes("cap rieng") || normalized.includes("dedicated")) {
    return "dedicated";
  }

  if (normalized.includes("thue") || normalized.includes("rental")) {
    return "rental";
  }

  if (normalized.includes("chinh chu") || normalized.includes("primary")) {
    return "primary";
  }

  return fallback;
};

const formatAccountTypeForSheet = (value = "primary") => {
  if (value === "dedicated") {
    return "C\u1ea5p ri\u00eang";
  }

  if (value === "rental") {
    return "Thu\u00ea";
  }

  return "Ch\u00ednh ch\u1ee7";
};

const formatDescriptionForSheet = (value = "") =>
  sanitizeSheetText(value)
    .replace(/\r?\n+/g, " | ")
    .replace(/\s+\|\s+/g, " | ")
    .trim();

const toPublicAvailabilityCell = (value) => (value ? "y" : "n");

const resolveUsdFallback = (amountVnd) => Math.round(amountVnd * DEFAULT_USD_PER_VND * 100) / 100;

const resolveUsdRegularPrice = (product, priceKey, fallbackVndAmount) => {
  const override = product.currencyPrices?.USD;
  const nestedValue =
    priceKey === "customer"
      ? override?.customerTierPrices?.regular
      : override?.tierPrices?.regular;

  if (typeof nestedValue === "number" && Number.isFinite(nestedValue) && nestedValue >= 0) {
    return nestedValue;
  }

  if (typeof override?.retailPrice === "number" && Number.isFinite(override.retailPrice) && override.retailPrice >= 0) {
    return override.retailPrice;
  }

  return resolveUsdFallback(fallbackVndAmount);
};

const parseImageCell = (value = "") => {
  const sanitized = sanitizeSheetText(value);

  if (!sanitized) {
    return "";
  }

  const formulaMatch = sanitized.match(/"(https?:\/\/[^"]+)"/i);

  if (formulaMatch?.[1]) {
    return formulaMatch[1];
  }

  return sanitized;
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

const buildExistingProductLookup = (products) => {
  const lookup = new Map();

  products.forEach((product) => {
    if (product.id) {
      lookup.set(`id:${product.id}`, product);
    }

    if (product.slug) {
      lookup.set(`slug:${product.slug}`, product);
    }
  });

  return lookup;
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

const toSheetRow = (product) => [
  product.id ?? "",
  product.image ?? "",
  product.name ?? "",
  formatDurationForSheet(product.usageDuration ?? "30 day", "30", "day"),
  formatDurationForSheet(product.warrantyDuration ?? `${product.warrantyMonths ?? 1} month`, "1", "month"),
  formatAccountTypeForSheet(product.accountType ?? "primary"),
  String(product.costPrice ?? 0),
  String(product.customerTierPrices?.regular ?? product.retailPrice ?? 0),
  String(product.tierPrices?.regular ?? product.retailPrice ?? 0),
  String(resolveUsdRegularPrice(product, "customer", product.customerTierPrices?.regular ?? product.retailPrice ?? 0)),
  String(resolveUsdRegularPrice(product, "ctv", product.tierPrices?.regular ?? product.retailPrice ?? 0)),
  formatDescriptionForSheet(product.shortDescription ?? ""),
  formatDescriptionForSheet(product.fullDescription ?? ""),
  toPublicAvailabilityCell(Boolean(product.published))
];

export const buildTemplateRowsFromProducts = async () => {
  const products = await readProductsFile();
  return [PRODUCT_SHEET_HEADERS, ...products.map((product) => toSheetRow(product))];
};

export const buildProductFromSheetRow = (row, existingLookup = new Map()) => {
  const rowId = sanitizeSheetText(row.id);
  const rowName = sanitizeSheetText(row.name);
  const rowSlug = sanitizeSheetText(row.slug) || (rowName ? slugify(rowName) : "");
  const existingProduct = existingLookup.get(`id:${rowId}`) ?? existingLookup.get(`slug:${rowSlug}`);
  const name = rowName || existingProduct?.name || "";
  const slug = rowSlug || existingProduct?.slug || slugify(name);
  const usageSource =
    sanitizeSheetText(row.usageDuration) ||
    (row.usageDurationValue ? `${sanitizeSheetText(row.usageDurationValue)} ${sanitizeSheetText(row.usageDurationUnit)}` : "") ||
    existingProduct?.usageDuration ||
    "30 day";
  const warrantySource =
    sanitizeSheetText(row.warrantyDuration) ||
    (row.warrantyMonths ? `${sanitizeSheetText(row.warrantyMonths)} month` : "") ||
    existingProduct?.warrantyDuration ||
    `${existingProduct?.warrantyMonths ?? 1} month`;
  const usageDuration = formatDurationForStorage(
    parseDurationValue(usageSource, "30", "day").value,
    parseDurationValue(usageSource, "30", "day").unit
  );
  const parsedWarranty = parseDurationValue(warrantySource, "1", "month");
  const warrantyDuration = formatDurationForStorage(parsedWarranty.value, parsedWarranty.unit);
  const warrantyMonths =
    parsedWarranty.unit === "year"
      ? Number(parsedWarranty.value) * 12
      : parsedWarranty.unit === "day"
        ? Math.max(1, Math.ceil(Number(parsedWarranty.value) / 30))
        : Number(parsedWarranty.value);
  const customerPriceVnd = parseMoneyCell(
    row.customerPriceVnd ?? row.customerRegularPrice ?? row.retailPrice,
    existingProduct?.customerTierPrices?.regular ?? existingProduct?.retailPrice ?? 0
  );
  const ctvPriceVnd = parseMoneyCell(
    row.ctvPriceVnd ?? row.ctvRegularPrice,
    existingProduct?.tierPrices?.regular ?? customerPriceVnd
  );
  const customerUsdRaw = sanitizeSheetText(row.customerPriceUsd);
  const ctvUsdRaw = sanitizeSheetText(row.ctvPriceUsd);
  const existingUsdOverride = existingProduct?.currencyPrices?.USD;
  const customerUsd = customerUsdRaw
    ? parseMoneyCell(customerUsdRaw, 0)
    : typeof existingUsdOverride?.customerTierPrices?.regular === "number"
      ? existingUsdOverride.customerTierPrices.regular
      : undefined;
  const ctvUsd = ctvUsdRaw
    ? parseMoneyCell(ctvUsdRaw, 0)
    : typeof existingUsdOverride?.tierPrices?.regular === "number"
      ? existingUsdOverride.tierPrices.regular
      : undefined;
  const published = parseBooleanCell(row.published, existingProduct?.published ?? true);
  const accountType = parseAccountTypeCell(row.accountType, existingProduct?.accountType ?? "primary");

  return {
    id: rowId || existingProduct?.id || `sheet-${slug}`,
    slug,
    name,
    shortDescription: sanitizeSheetText(row.shortDescription) || existingProduct?.shortDescription || "",
    fullDescription: restoreMultilineSheetText(row.fullDescription) || existingProduct?.fullDescription || "",
    usageDuration,
    warrantyDuration,
    costPrice: parseMoneyCell(row.costPrice, existingProduct?.costPrice ?? customerPriceVnd),
    retailPrice: customerPriceVnd,
    customerTierPrices: {
      regular: customerPriceVnd,
      vip: customerPriceVnd
    },
    category: existingProduct?.category,
    categories: existingProduct?.categories ?? [],
    accountType,
    featured: existingProduct?.featured ?? false,
    isFlashSale: existingProduct?.isFlashSale ?? false,
    flashSaleLabel: existingProduct?.flashSaleLabel,
    published,
    tierPrices: {
      regular: ctvPriceVnd,
      vip: ctvPriceVnd
    },
    currencyPrices:
      customerUsd !== undefined || ctvUsd !== undefined
        ? {
            ...(existingProduct?.currencyPrices ?? {}),
            USD: {
              retailPrice: customerUsd ?? resolveUsdFallback(customerPriceVnd),
              customerTierPrices: {
                regular: customerUsd ?? resolveUsdFallback(customerPriceVnd),
                vip: customerUsd ?? resolveUsdFallback(customerPriceVnd)
              },
              tierPrices: {
                regular: ctvUsd ?? resolveUsdFallback(ctvPriceVnd),
                vip: ctvUsd ?? resolveUsdFallback(ctvPriceVnd)
              }
            }
          }
        : existingProduct?.currencyPrices,
    overridePrices: existingProduct?.overridePrices ?? {},
    image: parseImageCell(row.image) || existingProduct?.image || "",
    warrantyMonths,
    stock: published ? Math.max(existingProduct?.stock ?? 1, 1) : 0,
    points: existingProduct?.points ?? 0,
    createdAt: existingProduct?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    translations: existingProduct?.translations
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
    .filter((row) => sanitizeSheetText(row.name) || sanitizeSheetText(row.id));
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
    .filter((row) => sanitizeSheetText(row.name) || sanitizeSheetText(row.id));

const readProductsFromPublicGoogleSheet = async (spreadsheetId, existingLookup) => {
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
  return dedupeProducts(rows.map((row) => buildProductFromSheetRow(row, existingLookup)));
};

export const readProductsFromGoogleSheet = async (spreadsheetId) => {
  const existingProducts = await readProductsFile();
  const existingLookup = buildExistingProductLookup(existingProducts);

  if (hasGoogleServiceAccountCredentials()) {
    try {
      const { sheets } = await createGoogleClients();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: PRODUCT_SHEET_RANGE
      });
      const rows = rowsToObjects(response.data.values ?? []);
      return dedupeProducts(rows.map((row) => buildProductFromSheetRow(row, existingLookup)));
    } catch (error) {
      if (process.env.GOOGLE_SHEET_DISABLE_PUBLIC_FALLBACK === "true") {
        throw error;
      }
    }
  }

  return readProductsFromPublicGoogleSheet(spreadsheetId, existingLookup);
};

export const DEFAULT_SHARED_EDITORS = [
  "hphumail@gmail.com",
  "hoangphupatrick@gmail.com",
  "phupunpin@gmail.com"
];
