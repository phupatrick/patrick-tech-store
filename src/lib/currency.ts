import { cache } from "react";

import { Language } from "@/lib/i18n";

export type CurrencyCode = "VND" | "USD";

export type CurrencySettings = {
  language: Language;
  currency: CurrencyCode;
  locale: string;
  usdPerVnd: number;
  sourceUrl: string;
  updatedAt?: string;
};

type FloatRatesResponse = {
  usd?: {
    rate?: number;
    date?: string;
  };
};

const FLOAT_RATES_VND_URL = "https://www.floatrates.com/daily/vnd.json";
const FLOAT_RATES_REFRESH_SECONDS = 60 * 60 * 6;
const DEFAULT_USD_PER_VND = 0.000038;
const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

const getUsdPerVndRate = cache(async () => {
  try {
    const response = await fetch(FLOAT_RATES_VND_URL, {
      next: { revalidate: FLOAT_RATES_REFRESH_SECONDS },
      headers: { accept: "application/json" }
    });

    if (response.ok) {
      const payload = (await response.json()) as FloatRatesResponse;
      const rate = payload.usd?.rate;

      if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
        return {
          usdPerVnd: rate,
          updatedAt: payload.usd?.date
        };
      }
    }
  } catch {
    // Fall back to the last verified rate if the live feed is temporarily unavailable.
  }

  return {
    usdPerVnd: DEFAULT_USD_PER_VND,
    updatedAt: undefined
  };
});

export const getCurrencySettings = async (language: Language): Promise<CurrencySettings> => {
  const exchangeRate = await getUsdPerVndRate();

  return {
    language,
    currency: language === "en" ? "USD" : "VND",
    locale: language === "en" ? "en-US" : "vi-VN",
    usdPerVnd: exchangeRate.usdPerVnd,
    updatedAt: exchangeRate.updatedAt,
    sourceUrl: FLOAT_RATES_VND_URL
  };
};

export const convertVndToDisplayAmount = (value: number, settings: CurrencySettings) =>
  settings.currency === "USD" ? value * settings.usdPerVnd : value;

export const convertDisplayAmountToVnd = (value: number, settings: CurrencySettings) =>
  settings.currency === "USD" ? value / settings.usdPerVnd : value;

const getCurrencyFormatter = (settings: CurrencySettings) => {
  const cacheKey = `${settings.locale}:${settings.currency}`;
  const cachedFormatter = currencyFormatterCache.get(cacheKey);

  if (cachedFormatter) {
    return cachedFormatter;
  }

  const formatter = new Intl.NumberFormat(settings.locale, {
    style: "currency",
    currency: settings.currency,
    minimumFractionDigits: settings.currency === "USD" ? 2 : 0,
    maximumFractionDigits: settings.currency === "USD" ? 2 : 0
  });

  currencyFormatterCache.set(cacheKey, formatter);
  return formatter;
};

export const formatCurrency = (value: number, settings: CurrencySettings) =>
  getCurrencyFormatter(settings).format(convertVndToDisplayAmount(value, settings));

export const formatCurrencyInputValue = (value: number, settings: CurrencySettings) => {
  const converted = convertVndToDisplayAmount(value, settings);
  return settings.currency === "USD" ? converted.toFixed(2) : String(Math.round(converted));
};
