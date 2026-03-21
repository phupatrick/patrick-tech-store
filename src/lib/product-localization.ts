import { parseDuration } from "@/lib/duration";
import { Language } from "@/lib/i18n";
import { Product, ProductTranslation } from "@/lib/types";

export const getLocalizedProductCopy = (
  product: Product,
  language: Language
): Required<Pick<ProductTranslation, "name" | "shortDescription" | "fullDescription">> &
  Pick<ProductTranslation, "category" | "categories" | "flashSaleLabel"> => {
  const translation = product.translations?.[language];

  return {
    name: translation?.name ?? product.name,
    shortDescription: translation?.shortDescription ?? product.shortDescription,
    fullDescription: translation?.fullDescription ?? product.fullDescription,
    category: translation?.category ?? product.category,
    categories: translation?.categories ?? product.categories,
    flashSaleLabel: translation?.flashSaleLabel ?? product.flashSaleLabel
  };
};

const localizeDuration = (
  value: string | number | undefined,
  language: Language,
  defaults: { value?: number; unit?: "day" | "month" | "year" }
) => {
  const parsed = parseDuration(value, defaults);

  if (parsed.isLifetime) {
    return language === "vi" ? "V\u0129nh vi\u1EC5n" : "Lifetime";
  }

  if (parsed.unit === "day") {
    return language === "vi" ? `${parsed.value} ng\u00E0y` : `${parsed.value} ${parsed.value === 1 ? "day" : "days"}`;
  }

  if (parsed.unit === "year") {
    return language === "vi" ? `${parsed.value} n\u0103m` : `${parsed.value} ${parsed.value === 1 ? "year" : "years"}`;
  }

  return language === "vi" ? `${parsed.value} th\u00E1ng` : `${parsed.value} ${parsed.value === 1 ? "month" : "months"}`;
};

export const getLocalizedUsageDuration = (value: string, language: Language) =>
  localizeDuration(value, language, { value: 30, unit: "day" });

export const getLocalizedWarrantyDuration = (value: string | number | undefined, language: Language) =>
  localizeDuration(typeof value === "number" ? `${value} month` : value, language, { value: 1, unit: "month" });
