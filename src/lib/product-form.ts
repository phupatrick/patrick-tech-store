import { formatCurrencyInputValue, CurrencySettings } from "@/lib/currency";
import { Language } from "@/lib/i18n";
import { getLocalizedProductCopy } from "@/lib/product-localization";
import { Product, ProductAccountType } from "@/lib/types";

export type UsageDurationUnit = "day" | "month";

export type ProductFormValues = {
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  usageDurationValue: string;
  usageDurationUnit: UsageDurationUnit;
  costPrice: string;
  image: string;
  removeImage: boolean;
  customerRegularPrice: string;
  customerVipPrice: string;
  ctvRegularPrice: string;
  ctvVipPrice: string;
  warrantyMonths: string;
  category: string;
  accountType: ProductAccountType;
  featured: boolean;
  isFlashSale: boolean;
  flashSaleLabel: string;
  published: boolean;
};

export type ProductFormState = {
  error?: string;
  values: ProductFormValues;
};

export const emptyProductFormValues: ProductFormValues = {
  name: "",
  slug: "",
  shortDescription: "",
  fullDescription: "",
  usageDurationValue: "30",
  usageDurationUnit: "day",
  costPrice: "",
  image: "",
  removeImage: false,
  customerRegularPrice: "",
  customerVipPrice: "",
  ctvRegularPrice: "",
  ctvVipPrice: "",
  warrantyMonths: "12",
  category: "",
  accountType: "dedicated",
  featured: false,
  isFlashSale: false,
  flashSaleLabel: "",
  published: true
};

export const formatUsageDuration = (value: string | number, unit: UsageDurationUnit) =>
  `${String(value).trim()} ${unit === "day" ? "ngay" : "thang"}`;

export const parseUsageDuration = (value: string): { value: string; unit: UsageDurationUnit } => {
  const trimmed = value.trim();
  const matchedValue = trimmed.match(/\d+/)?.[0] ?? "30";
  const normalized = trimmed.toLowerCase();
  const unit: UsageDurationUnit = normalized.includes("month") || normalized.includes("thang") ? "month" : "day";

  return {
    value: matchedValue,
    unit
  };
};

export const productToFormValues = (
  product: Product,
  currencySettings: CurrencySettings,
  language: Language
): ProductFormValues => {
  const usageDuration = parseUsageDuration(product.usageDuration);
  const localized = getLocalizedProductCopy(product, language);

  return {
    name: localized.name,
    slug: product.slug,
    shortDescription: localized.shortDescription,
    fullDescription: localized.fullDescription,
    usageDurationValue: usageDuration.value,
    usageDurationUnit: usageDuration.unit,
    costPrice: formatCurrencyInputValue(product.costPrice, currencySettings),
    image: product.image,
    removeImage: false,
    customerRegularPrice: formatCurrencyInputValue(product.customerTierPrices.regular, currencySettings),
    customerVipPrice: formatCurrencyInputValue(product.customerTierPrices.vip, currencySettings),
    ctvRegularPrice: formatCurrencyInputValue(product.tierPrices.regular, currencySettings),
    ctvVipPrice: formatCurrencyInputValue(product.tierPrices.vip, currencySettings),
    warrantyMonths: String(product.warrantyMonths),
    category: localized.categories?.join(", ") ?? localized.category ?? "",
    accountType: product.accountType,
    featured: product.featured,
    isFlashSale: product.isFlashSale,
    flashSaleLabel: localized.flashSaleLabel ?? "",
    published: product.published
  };
};

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
