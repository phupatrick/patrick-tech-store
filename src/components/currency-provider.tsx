"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import {
  convertVndToDisplayAmount,
  CURRENCY_COOKIE_NAME,
  CURRENCY_STORAGE_KEY,
  CurrencySettings,
  formatCurrency,
  formatCurrencyValue,
  isCurrencyCode
} from "@/lib/currency";
import { CurrencyCode } from "@/lib/types";

type CurrencyContextValue = {
  settings: CurrencySettings;
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  format: (value: number) => string;
  formatDisplay: (value: number) => string;
  toDisplayAmount: (value: number) => number;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const persistCurrency = (currency: CurrencyCode) => {
  window.localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
  document.cookie = `${CURRENCY_COOKIE_NAME}=${currency}; path=/; max-age=31536000; samesite=lax`;
};

export function CurrencyProvider({
  initialSettings,
  children
}: Readonly<{ initialSettings: CurrencySettings; children: ReactNode }>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [currency, setCurrencyState] = useState<CurrencyCode>(initialSettings.currency);

  const reloadForCurrency = () => {
    const nextSearch = searchParams.toString();
    const nextUrl = nextSearch ? `${pathname}?${nextSearch}` : pathname;
    window.location.replace(nextUrl);
  };

  useEffect(() => {
    const stored = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
    const resolved = isCurrencyCode(stored) ? stored : initialSettings.currency;

    if (resolved !== currency) {
      persistCurrency(resolved);
      setCurrencyState(resolved);
      reloadForCurrency();
      return;
    }

    persistCurrency(currency);
  }, [currency, initialSettings.currency, pathname, searchParams]);

  const setCurrency = (nextCurrency: CurrencyCode) => {
    if (nextCurrency === currency) {
      return;
    }

    persistCurrency(nextCurrency);
    setCurrencyState(nextCurrency);
    reloadForCurrency();
  };

  const value = useMemo<CurrencyContextValue>(
    () => ({
      settings: initialSettings,
      currency,
      setCurrency,
      format: (amount) => formatCurrency(amount, initialSettings),
      formatDisplay: (amount) => formatCurrencyValue(amount, initialSettings),
      toDisplayAmount: (amount) => convertVndToDisplayAmount(amount, initialSettings)
    }),
    [currency, initialSettings]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export const useCurrency = () => {
  const context = useContext(CurrencyContext);

  if (!context) {
    throw new Error("useCurrency must be used within CurrencyProvider.");
  }

  return context;
};
