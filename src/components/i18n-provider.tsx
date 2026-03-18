"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import {
  getDictionary,
  isLanguage,
  interpolate,
  LANGUAGE_COOKIE_NAME,
  LANGUAGE_STORAGE_KEY,
  Language,
  TranslationKey
} from "@/lib/i18n";

type TranslationParams = Record<string, string | number>;

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const persistLanguage = (language: Language) => {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  document.cookie = `${LANGUAGE_COOKIE_NAME}=${language}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = language;
};

export function I18nProvider({
  initialLanguage,
  children
}: Readonly<{ initialLanguage: Language; children: ReactNode }>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  const reloadForLanguage = () => {
    const nextSearch = searchParams.toString();
    const nextUrl = nextSearch ? `${pathname}?${nextSearch}` : pathname;
    window.location.replace(nextUrl);
  };

  useEffect(() => {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const resolved = isLanguage(stored) ? stored : initialLanguage;

    if (resolved !== language) {
      persistLanguage(resolved);
      setLanguageState(resolved);
      reloadForLanguage();
      return;
    }

    persistLanguage(language);
  }, [initialLanguage, language, pathname, searchParams]);

  const setLanguage = (nextLanguage: Language) => {
    if (nextLanguage === language) {
      return;
    }

    persistLanguage(nextLanguage);
    setLanguageState(nextLanguage);
    reloadForLanguage();
  };

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key, params) => interpolate(getDictionary(language)[key], params)
    }),
    [language]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider.");
  }

  return context;
};
