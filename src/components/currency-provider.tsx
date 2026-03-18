"use client";

import { createContext, ReactNode, useContext, useMemo } from "react";

import { CurrencySettings, formatCurrency } from "@/lib/currency";

type CurrencyContextValue = {
  settings: CurrencySettings;
  format: (value: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({
  initialSettings,
  children
}: Readonly<{ initialSettings: CurrencySettings; children: ReactNode }>) {
  const value = useMemo<CurrencyContextValue>(
    () => ({
      settings: initialSettings,
      format: (amount) => formatCurrency(amount, initialSettings)
    }),
    [initialSettings]
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
