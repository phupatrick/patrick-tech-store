import { en } from "@/lib/i18n/dictionaries/en";
import { vi } from "@/lib/i18n/dictionaries/vi";

export const LANGUAGES = ["en", "vi"] as const;
export type Language = (typeof LANGUAGES)[number];
export type TranslationKey = keyof typeof en;
type TranslationDictionary = Record<TranslationKey, string>;
type TranslationParams = Record<string, string | number>;

export const LANGUAGE_COOKIE_NAME = "preferred-language";
export const LANGUAGE_STORAGE_KEY = "preferred-language";

const dictionaries: Record<Language, TranslationDictionary> = {
  en,
  vi
};

export const isLanguage = (value?: string | null): value is Language =>
  Boolean(value && LANGUAGES.includes(value as Language));

export const getDictionary = (language: Language) => dictionaries[language];

export const interpolate = (template: string, params?: TranslationParams) => {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, token: string) => String(params[token] ?? ""));
};

export const translate = (language: Language, key: TranslationKey, params?: TranslationParams) =>
  interpolate(getDictionary(language)[key], params);

export const getProductName = (language: Language, productId: string) =>
  translate(language, `product.${productId}.name` as TranslationKey);

export const getProductDescription = (language: Language, productId: string) =>
  translate(language, `product.${productId}.description` as TranslationKey);

export const detectLanguageFromRegion = (value?: string | null) => {
  const normalized = value?.toUpperCase() ?? "";

  return normalized.includes("VN") || normalized.includes("VI") ? "vi" : "en";
};

export const detectLanguageFromHeaders = (country?: string | null, acceptLanguage?: string | null): Language => {
  if ((country ?? "").toUpperCase() === "VN") {
    return "vi";
  }

  if ((acceptLanguage ?? "").toLowerCase().includes("vi")) {
    return "vi";
  }

  return "en";
};

export const detectRuntimeLanguage = (): Language => {
  if (typeof window === "undefined") {
    return "en";
  }

  const languages = navigator.languages.length > 0 ? navigator.languages : [navigator.language];
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (languages.some((entry) => detectLanguageFromRegion(entry) === "vi")) {
    return "vi";
  }

  if (timeZone.toLowerCase().includes("ho_chi_minh") || timeZone.toLowerCase().includes("saigon")) {
    return "vi";
  }

  return "en";
};

export const createTranslator = (language: Language) => ({
  language,
  t: (key: TranslationKey, params?: TranslationParams) => translate(language, key, params)
});
