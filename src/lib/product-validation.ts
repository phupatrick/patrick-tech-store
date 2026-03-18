import { convertDisplayAmountToVnd, CurrencySettings, roundCurrencyAmount } from "@/lib/currency";
import { Language, translate } from "@/lib/i18n";
import { normalizeCategoryList } from "@/lib/product-categories";
import { formatUsageDuration, ProductFormValues, slugify, UsageDurationUnit } from "@/lib/product-form";
import { isSlugTaken } from "@/lib/product-store";
import { CurrencyCode, Product, ProductAccountType, ProductPriceSet } from "@/lib/types";

const isProductAccountType = (value: string): value is ProductAccountType =>
  ["dedicated", "primary", "rental"].includes(value);

const isUsageDurationUnit = (value: string): value is UsageDurationUnit => ["day", "month"].includes(value);

export const getProductValuesFromFormData = (formData: FormData): ProductFormValues => ({
  name: String(formData.get("name") ?? "").trim(),
  slug: slugify(String(formData.get("slug") ?? "")),
  shortDescription: String(formData.get("shortDescription") ?? "").trim(),
  fullDescription: String(formData.get("fullDescription") ?? "").trim(),
  usageDurationValue: String(formData.get("usageDurationValue") ?? "").trim(),
  usageDurationUnit: isUsageDurationUnit(String(formData.get("usageDurationUnit") ?? "day"))
    ? (String(formData.get("usageDurationUnit")) as UsageDurationUnit)
    : "day",
  costPrice: String(formData.get("costPrice") ?? "").trim(),
  image: String(formData.get("currentImage") ?? "").trim(),
  removeImage: formData.get("removeImage") === "true",
  customerRegularPrice: String(formData.get("customerRegularPrice") ?? "").trim(),
  customerVipPrice: String(formData.get("customerVipPrice") ?? "").trim(),
  ctvRegularPrice: String(formData.get("ctvRegularPrice") ?? "").trim(),
  ctvVipPrice: String(formData.get("ctvVipPrice") ?? "").trim(),
  warrantyMonths: String(formData.get("warrantyMonths") ?? "").trim(),
  category: String(formData.get("category") ?? "").trim(),
  accountType: isProductAccountType(String(formData.get("accountType") ?? ""))
    ? (String(formData.get("accountType")) as ProductAccountType)
    : "dedicated",
  featured: formData.get("featured") === "on",
  isFlashSale: formData.get("isFlashSale") === "on",
  flashSaleLabel: String(formData.get("flashSaleLabel") ?? "").trim(),
  published: formData.get("published") === "on"
});

type ValidationResult =
  | {
      ok: true;
      data: Pick<
        Product,
        | "name"
        | "slug"
        | "shortDescription"
        | "fullDescription"
        | "usageDuration"
        | "costPrice"
        | "image"
        | "warrantyMonths"
        | "category"
        | "categories"
        | "accountType"
        | "featured"
        | "isFlashSale"
        | "flashSaleLabel"
        | "published"
      > & {
        vndPricing: ProductPriceSet;
        currencyPriceOverride?: {
          currency: CurrencyCode;
          prices: ProductPriceSet;
        };
      };
    }
  | { ok: false; error: string };

const parseDisplayMoney = (value: string) => Number.parseFloat(value.replace(/,/g, ""));

const parseExactMoney = (value: string, currency: CurrencyCode) => {
  const parsedValue = parseDisplayMoney(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return undefined;
  }

  return roundCurrencyAmount(parsedValue, currency);
};

const parseStoredMoney = (value: string, settings: CurrencySettings) => {
  const parsedValue = parseDisplayMoney(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return undefined;
  }

  const convertedValue = convertDisplayAmountToVnd(parsedValue, settings);

  if (!Number.isFinite(convertedValue) || convertedValue < 0) {
    return undefined;
  }

  return Math.round(convertedValue);
};

export const validateProductValues = (
  values: ProductFormValues,
  language: Language,
  currencySettings: CurrencySettings,
  currentProductId?: string
): ValidationResult => {
  if (!values.name) {
    return { ok: false, error: translate(language, "admin.validation.nameRequired") };
  }

  if (!values.slug) {
    return { ok: false, error: translate(language, "admin.validation.slugRequired") };
  }

  if (isSlugTaken(values.slug, currentProductId)) {
    return { ok: false, error: translate(language, "admin.validation.slugUnique") };
  }

  if (!values.shortDescription) {
    return { ok: false, error: translate(language, "admin.validation.shortDescriptionRequired") };
  }

  if (!values.fullDescription) {
    return { ok: false, error: translate(language, "admin.validation.fullDescriptionRequired") };
  }

  const usageDurationValue = Number(values.usageDurationValue);

  if (!Number.isInteger(usageDurationValue) || usageDurationValue <= 0) {
    return { ok: false, error: translate(language, "admin.validation.usageDurationInvalid") };
  }

  const costPrice = parseStoredMoney(values.costPrice, currencySettings);
  const customerRegularDisplayPrice = parseExactMoney(values.customerRegularPrice, currencySettings.currency);
  const customerVipDisplayPrice = parseExactMoney(values.customerVipPrice, currencySettings.currency);
  const ctvRegularDisplayPrice = parseExactMoney(values.ctvRegularPrice, currencySettings.currency);
  const ctvVipDisplayPrice = parseExactMoney(values.ctvVipPrice, currencySettings.currency);
  const customerRegularPrice =
    customerRegularDisplayPrice !== undefined
      ? roundCurrencyAmount(convertDisplayAmountToVnd(customerRegularDisplayPrice, currencySettings), "VND")
      : undefined;
  const customerVipPrice =
    customerVipDisplayPrice !== undefined
      ? roundCurrencyAmount(convertDisplayAmountToVnd(customerVipDisplayPrice, currencySettings), "VND")
      : undefined;
  const ctvRegularPrice =
    ctvRegularDisplayPrice !== undefined
      ? roundCurrencyAmount(convertDisplayAmountToVnd(ctvRegularDisplayPrice, currencySettings), "VND")
      : undefined;
  const ctvVipPrice =
    ctvVipDisplayPrice !== undefined
      ? roundCurrencyAmount(convertDisplayAmountToVnd(ctvVipDisplayPrice, currencySettings), "VND")
      : undefined;
  const warrantyMonths = Number(values.warrantyMonths);

  const numericValues = [
    costPrice,
    customerRegularDisplayPrice,
    customerVipDisplayPrice,
    ctvRegularDisplayPrice,
    ctvVipDisplayPrice
  ];

  if (numericValues.some((value) => typeof value !== "number" || !Number.isFinite(value) || value < 0)) {
    return { ok: false, error: translate(language, "admin.validation.retailPriceInvalid") };
  }

  if (!Number.isInteger(warrantyMonths) || warrantyMonths < 0) {
    return { ok: false, error: translate(language, "admin.validation.warrantyMonthsInvalid") };
  }

  return {
    ok: true,
    data: {
      name: values.name,
      slug: values.slug,
      shortDescription: values.shortDescription,
      fullDescription: values.fullDescription,
      usageDuration: formatUsageDuration(values.usageDurationValue, values.usageDurationUnit),
      costPrice: costPrice ?? 0,
      image: values.image,
      vndPricing: {
        retailPrice: customerRegularPrice ?? 0,
        tierPrices: {
          regular: ctvRegularPrice ?? 0,
          vip: ctvVipPrice ?? 0
        },
        customerTierPrices: {
          regular: customerRegularPrice ?? 0,
          vip: customerVipPrice ?? 0
        }
      },
      currencyPriceOverride:
        currencySettings.currency === "USD"
          ? {
              currency: "USD",
              prices: {
                retailPrice: customerRegularDisplayPrice ?? 0,
                tierPrices: {
                  regular: ctvRegularDisplayPrice ?? 0,
                  vip: ctvVipDisplayPrice ?? 0
                },
                customerTierPrices: {
                  regular: customerRegularDisplayPrice ?? 0,
                  vip: customerVipDisplayPrice ?? 0
                }
              }
            }
          : undefined,
      warrantyMonths,
      category: values.category || undefined,
      categories: normalizeCategoryList(values.category),
      accountType: values.accountType,
      featured: values.featured,
      isFlashSale: values.isFlashSale,
      flashSaleLabel: values.flashSaleLabel || undefined,
      published: values.published
    }
  };
};
