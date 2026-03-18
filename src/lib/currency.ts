import { cache } from "react";

import { Language } from "@/lib/i18n";
import { CurrencyCode } from "@/lib/types";

export const CURRENCIES = ["VND", "USD"] as const;
export const CURRENCY_COOKIE_NAME = "preferred-currency";
export const CURRENCY_STORAGE_KEY = "preferred-currency";

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
export const DEFAULT_USD_PER_VND = 0.000038;
const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

export const isCurrencyCode = (value?: string | null): value is CurrencyCode =>
  Boolean(value && CURRENCIES.includes(value as CurrencyCode));

export const getDefaultCurrencyForLanguage = (language: Language): CurrencyCode =>
  language === "en" ? "USD" : "VND";

export const resolveCurrencyCode = (language: Language, preferredCurrency?: string | null): CurrencyCode =>
  isCurrencyCode(preferredCurrency) ? preferredCurrency : getDefaultCurrencyForLanguage(language);

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

export const getCurrencySettings = async (
  language: Language,
  preferredCurrency?: string | null
): Promise<CurrencySettings> => {
  const exchangeRate = await getUsdPerVndRate();
  const currency = resolveCurrencyCode(language, preferredCurrency);

  return {
    language,
    currency,
    locale: currency === "USD" ? "en-US" : "vi-VN",
    usdPerVnd: exchangeRate.usdPerVnd,
    updatedAt: exchangeRate.updatedAt,
    sourceUrl: FLOAT_RATES_VND_URL
  };
};

export const convertVndToDisplayAmount = (value: number, settings: CurrencySettings) =>
  settings.currency === "USD" ? value * settings.usdPerVnd : value;

export const convertDisplayAmountToVnd = (value: number, settings: CurrencySettings) =>
  settings.currency === "USD" ? value / settings.usdPerVnd : value;

export const roundCurrencyAmount = (value: number, currency: CurrencyCode) =>
  currency === "USD" ? Number(value.toFixed(2)) : Math.round(value);

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
  getCurrencyFormatter(settings).format(roundCurrencyAmount(convertVndToDisplayAmount(value, settings), settings.currency));

export const formatCurrencyValue = (value: number, settings: CurrencySettings) =>
  getCurrencyFormatter(settings).format(roundCurrencyAmount(value, settings.currency));

export const formatCurrencyInputDisplayValue = (value: number, settings: CurrencySettings) => {
  const rounded = roundCurrencyAmount(value, settings.currency);
  return settings.currency === "USD" ? rounded.toFixed(2) : String(Math.round(rounded));
};

export const formatCurrencyInputValue = (value: number, settings: CurrencySettings) =>
  formatCurrencyInputDisplayValue(convertVndToDisplayAmount(value, settings), settings);
