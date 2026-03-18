import { Language } from "@/lib/i18n";
import { normalizeText } from "@/lib/product-categories";
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

export const getLocalizedUsageDuration = (value: string, language: Language) => {
  const trimmed = value.trim();
  const normalized = normalizeText(trimmed);

  if (!trimmed) {
    return language === "vi" ? "30 ng\u00E0y" : "30 days";
  }

  if (["vinh vien", "lifetime", "permanent", "forever"].some((token) => normalized.includes(token))) {
    return language === "vi" ? "V\u0129nh vi\u1EC5n" : "Lifetime";
  }

  const count = Number(normalized.match(/\d+/)?.[0] ?? Number.NaN);
  const hasDays = /\b(day|days|ngay)\b/i.test(normalized);
  const hasMonths = /\b(month|months|thang)\b/i.test(normalized);
  const hasYears = /\b(year|years|nam)\b/i.test(normalized);

  if (Number.isFinite(count)) {
    if (hasDays) {
      return language === "vi" ? `${count} ng\u00E0y` : `${count} ${count === 1 ? "day" : "days"}`;
    }

    if (hasMonths) {
      return language === "vi" ? `${count} th\u00E1ng` : `${count} ${count === 1 ? "month" : "months"}`;
    }

    if (hasYears) {
      return language === "vi" ? `${count} n\u0103m` : `${count} ${count === 1 ? "year" : "years"}`;
    }
  }

  return trimmed;
};

export const getLocalizedWarrantyDuration = (months: number, language: Language) => {
  const safeMonths = Number.isFinite(months) ? Math.max(0, Math.trunc(months)) : 0;

  if (language === "vi") {
    return `${safeMonths} tháng`;
  }

  return `${safeMonths} ${safeMonths === 1 ? "month" : "months"}`;
};
