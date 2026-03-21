import { CURRENCY_COOKIE_NAME, CURRENCY_STORAGE_KEY, getDefaultCurrencyForLanguage } from "@/lib/currency";
import { LANGUAGE_COOKIE_NAME, LANGUAGE_STORAGE_KEY, Language } from "@/lib/i18n";

const persistCookie = (name: string, value: string) => {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
};

export const applyLanguagePreset = (language: Language) => {
  const currency = getDefaultCurrencyForLanguage(language);

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  window.localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
  persistCookie(LANGUAGE_COOKIE_NAME, language);
  persistCookie(CURRENCY_COOKIE_NAME, currency);
  document.documentElement.lang = language;

  const params = new URLSearchParams(window.location.search);
  params.delete("welcome");
  const nextSearch = params.toString();
  const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
  window.location.replace(nextUrl);
};

export const hasStoredLanguagePreference = () => {
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored === "vi" || stored === "en";
};
