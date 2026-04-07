import { cache } from "react";

import { CurrencySettings, roundCurrencyAmount } from "@/lib/currency";
import { normalizeText } from "@/lib/product-categories";
import { convertDisplayPriceSetToStored } from "@/lib/product-pricing";
import { AuthSession, Product, ProductPriceSet } from "@/lib/types";

const FOREIGN_RESELLER_ACCESS_CODE_ID = "seed-ctv-foreign-sp201";
const FOREIGN_PRICE_SHEET_EXPORT_URL =
  "https://docs.google.com/spreadsheets/d/1-lCZ8VHcxdqqBMSr82S_ErOR0b-lVhFcXdZpNKTBgTA/export?format=csv&gid=0";
const FOREIGN_PRICE_REFRESH_SECONDS = 60 * 30;

type ForeignPricingContext = "foreign_customer" | "foreign_reseller";

type ForeignSheetRow = {
  app: string;
  duration: string;
  resellerUsd: number;
  warranty: string;
  accountType: string;
  notes: string;
  normalizedApp: string;
  normalizedDuration: string;
  normalizedWarranty: string;
  normalizedAccountType: string;
  normalizedNotes: string;
};

type ForeignPricingOverride = {
  context: ForeignPricingContext;
  storedPriceSet: ProductPriceSet;
  displayPriceSet: ProductPriceSet;
  customerMarkupPercent: number;
  sourceApp: string;
};

const FOREIGN_TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\+/g, " "],
  [/&/g, " "],
  [/klingstanda/g, "kling standard"],
  [/kling standa/g, "kling standard"],
  [/chat gpt/g, "chatgpt"],
  [/youtube premium/g, "youtube premium"],
  [/customer owned/g, "customer owned"],
  [/private shared/g, "private shared"],
  [/acc cap/g, "issued account"],
  [/chinh chu/g, "primary account"],
  [/thang/g, "month"],
  [/nam/g, "year"],
  [/ngay/g, "day"],
  [/gio/g, "hour"],
  [/\bmonths\b/g, "month"],
  [/\byears\b/g, "year"],
  [/\bdays\b/g, "day"],
  [/\bhours\b/g, "hour"]
];

const FOREIGN_STOP_WORDS = new Set([
  "account",
  "accounts",
  "customer",
  "owned",
  "private",
  "shared",
  "issued",
  "gift",
  "team",
  "slot",
  "add",
  "or",
  "the",
  "month",
  "year",
  "day",
  "hour"
]);

const normalizeForeignText = (value: string) => {
  let normalized = normalizeText(value);

  FOREIGN_TEXT_REPLACEMENTS.forEach(([pattern, replacement]) => {
    normalized = normalized.replace(pattern, replacement);
  });

  return normalized.replace(/\s+/g, " ").trim();
};

const getForeignTokens = (value: string) =>
  Array.from(
    new Set(
      normalizeForeignText(value)
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token && !FOREIGN_STOP_WORDS.has(token))
    )
  );

const parseSheetPrice = (value: string) => {
  const normalized = value.trim().toLowerCase();

  if (!normalized || normalized === "stop") {
    return undefined;
  }

  if (normalized === "free") {
    return 0;
  }

  const decimalNormalized = normalized.replace(/\$/g, "").replace(/,/g, ".");
  const parsed = Number.parseFloat(decimalNormalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeDurationKey = (value: string) => {
  const normalized = normalizeForeignText(value);

  if (!normalized) {
    return "";
  }

  if (normalized.includes("full credit")) {
    return "full-credit";
  }

  const rangeMatch = normalized.match(/(\d+)\s*-\s*(\d+)/);
  const singleMatch = normalized.match(/(\d+(?:\.\d+)?)/);
  const unit = normalized.includes("year")
    ? "year"
    : normalized.includes("month")
      ? "month"
      : normalized.includes("day")
        ? "day"
        : normalized.includes("hour") || normalized.includes("24h")
          ? "hour"
          : "";

  if (!singleMatch || !unit) {
    return normalized;
  }

  const start = Number.parseFloat(rangeMatch?.[1] ?? singleMatch[1]);
  const end = Number.parseFloat(rangeMatch?.[2] ?? singleMatch[1]);

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return normalized;
  }

  if (unit === "year") {
    return `${start * 12}-${end * 12}:month`;
  }

  if (unit === "month") {
    return `${start}-${end}:month`;
  }

  if (unit === "day") {
    return `${start}-${end}:day`;
  }

  return `${start}-${end}:hour`;
};

const isAccountTypeCompatible = (accountType: Product["accountType"], normalizedAccountType: string) => {
  if (!normalizedAccountType) {
    return true;
  }

  const expectsPrimary = normalizedAccountType.includes("customer owned");
  const expectsShared = normalizedAccountType.includes("private shared");

  if (expectsPrimary && expectsShared) {
    return true;
  }

  if (expectsPrimary) {
    return accountType === "primary";
  }

  if (expectsShared) {
    return accountType !== "primary";
  }

  return true;
};

const parseForeignCsv = (content: string) => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];

    if (inQuotes) {
      if (character === "\"") {
        if (content[index + 1] === "\"") {
          currentField += "\"";
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += character;
      }

      continue;
    }

    if (character === "\"") {
      inQuotes = true;
      continue;
    }

    if (character === ",") {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if (character === "\n") {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
      continue;
    }

    if (character !== "\r") {
      currentField += character;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
};

const getForeignSheetRows = cache(async (): Promise<ForeignSheetRow[]> => {
  try {
    const response = await fetch(FOREIGN_PRICE_SHEET_EXPORT_URL, {
      next: { revalidate: FOREIGN_PRICE_REFRESH_SECONDS },
      headers: { accept: "text/csv" }
    });

    if (!response.ok) {
      return [];
    }

    const content = await response.text();
    const rows = parseForeignCsv(content);
    const [, ...dataRows] = rows;

    return dataRows
      .map((row) => {
        const app = row[0]?.trim() ?? "";
        const duration = row[1]?.trim() ?? "";
        const resellerUsd = parseSheetPrice(row[2] ?? "");

        if (!app || resellerUsd === undefined) {
          return undefined;
        }

        const warranty = row[3]?.trim() ?? "";
        const accountType = row[4]?.trim() ?? "";
        const notes = row[5]?.trim() ?? "";

        return {
          app,
          duration,
          resellerUsd,
          warranty,
          accountType,
          notes,
          normalizedApp: normalizeForeignText(app),
          normalizedDuration: normalizeDurationKey(duration),
          normalizedWarranty: normalizeDurationKey(warranty),
          normalizedAccountType: normalizeForeignText(accountType),
          normalizedNotes: normalizeForeignText(notes)
        } satisfies ForeignSheetRow;
      })
      .filter(Boolean) as ForeignSheetRow[];
  } catch {
    return [];
  }
});

const getForeignProductHaystack = (product: Product) =>
  normalizeForeignText(
    [
      product.slug,
      product.name,
      product.shortDescription,
      product.fullDescription,
      product.translations?.vi?.name,
      product.translations?.en?.name,
      product.translations?.vi?.shortDescription,
      product.translations?.en?.shortDescription
    ]
      .filter(Boolean)
      .join(" ")
  );

const getForeignProductDurationKey = (product: Product) => normalizeDurationKey(product.usageDuration);
const getForeignProductWarrantyKey = (product: Product) =>
  normalizeDurationKey(product.warrantyDuration ?? `${product.warrantyMonths} month`);

const getForeignRowScore = (product: Product, row: ForeignSheetRow) => {
  const productHaystack = getForeignProductHaystack(product);
  const productDurationKey = getForeignProductDurationKey(product);
  const productWarrantyKey = getForeignProductWarrantyKey(product);
  const rowTokens = getForeignTokens(row.app);
  const matchedTokens = rowTokens.filter((token) => productHaystack.includes(token));

  if (matchedTokens.length === 0) {
    return Number.NEGATIVE_INFINITY;
  }

  if (rowTokens.length > 1 && matchedTokens.length < Math.max(2, Math.ceil(rowTokens.length / 2))) {
    return Number.NEGATIVE_INFINITY;
  }

  let score = matchedTokens.length * 10 - (rowTokens.length - matchedTokens.length) * 4;

  if (productHaystack.includes(row.normalizedApp)) {
    score += 6;
  }

  if (productDurationKey && row.normalizedDuration) {
    score += productDurationKey === row.normalizedDuration ? 18 : -18;
  }

  if (productWarrantyKey && row.normalizedWarranty) {
    score += productWarrantyKey === row.normalizedWarranty ? 6 : -4;
  }

  if (isAccountTypeCompatible(product.accountType, row.normalizedAccountType)) {
    score += 4;
  }

  if (row.normalizedNotes && productHaystack.includes(row.normalizedNotes)) {
    score += 4;
  }

  return score;
};

const getBestForeignSheetRowForProduct = async (product: Product) => {
  const rows = await getForeignSheetRows();
  let bestMatch: ForeignSheetRow | undefined;
  let bestScore = Number.NEGATIVE_INFINITY;

  rows.forEach((row) => {
    const score = getForeignRowScore(product, row);

    if (score > bestScore) {
      bestMatch = row;
      bestScore = score;
    }
  });

  if (!bestMatch || bestScore < 10) {
    return undefined;
  }

  return bestMatch;
};

const getForeignCustomerMarkupPercent = (resellerUsd: number) => {
  if (resellerUsd <= 1) {
    return 30;
  }

  if (resellerUsd <= 3) {
    return 25;
  }

  if (resellerUsd <= 8) {
    return 20;
  }

  if (resellerUsd <= 15) {
    return 15;
  }

  return 10;
};

const toUsdPriceSet = (resellerUsd: number, customerUsd: number): ProductPriceSet => ({
  retailPrice: customerUsd,
  customerTierPrices: {
    regular: customerUsd,
    vip: customerUsd
  },
  tierPrices: {
    regular: resellerUsd,
    vip: resellerUsd
  }
});

const getForeignDisplayPriceSet = (usdPriceSet: ProductPriceSet, settings: CurrencySettings) => {
  if (settings.currency === "USD") {
    return {
      retailPrice: roundCurrencyAmount(usdPriceSet.retailPrice, "USD"),
      customerTierPrices: {
        regular: roundCurrencyAmount(usdPriceSet.customerTierPrices.regular, "USD"),
        vip: roundCurrencyAmount(usdPriceSet.customerTierPrices.vip, "USD")
      },
      tierPrices: {
        regular: roundCurrencyAmount(usdPriceSet.tierPrices.regular, "USD"),
        vip: roundCurrencyAmount(usdPriceSet.tierPrices.vip, "USD")
      }
    };
  }

  const usdSettings: CurrencySettings = {
    ...settings,
    language: "en",
    currency: "USD",
    locale: "en-US"
  };

  return convertDisplayPriceSetToStored(usdPriceSet, usdSettings);
};

const resolveForeignPricingContext = (settings: CurrencySettings, session?: Pick<AuthSession, "role" | "subject">) => {
  if (session?.role === "reseller" && session.subject === FOREIGN_RESELLER_ACCESS_CODE_ID) {
    return "foreign_reseller" satisfies ForeignPricingContext;
  }

  if (!session || session.role === "customer") {
    return settings.currency === "USD" ? ("foreign_customer" satisfies ForeignPricingContext) : undefined;
  }

  return undefined;
};

export const getForeignPricingOverride = async (
  product: Product,
  settings: CurrencySettings,
  session?: Pick<AuthSession, "role" | "subject">
): Promise<ForeignPricingOverride | undefined> => {
  const context = resolveForeignPricingContext(settings, session);

  if (!context) {
    return undefined;
  }

  const row = await getBestForeignSheetRowForProduct(product);

  if (!row) {
    return undefined;
  }

  const customerMarkupPercent = getForeignCustomerMarkupPercent(row.resellerUsd);
  const customerUsd = roundCurrencyAmount(row.resellerUsd * (1 + customerMarkupPercent / 100), "USD");
  const usdPriceSet = toUsdPriceSet(row.resellerUsd, customerUsd);
  const storedPriceSet = convertDisplayPriceSetToStored(usdPriceSet, {
    ...settings,
    language: "en",
    currency: "USD",
    locale: "en-US"
  });

  return {
    context,
    storedPriceSet,
    displayPriceSet: getForeignDisplayPriceSet(usdPriceSet, settings),
    customerMarkupPercent,
    sourceApp: row.app
  };
};
