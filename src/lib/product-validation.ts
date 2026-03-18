import { convertDisplayAmountToVnd, CurrencySettings } from "@/lib/currency";
import { Language, translate } from "@/lib/i18n";
import { normalizeCategoryList } from "@/lib/product-categories";
import { formatUsageDuration, ProductFormValues, slugify, UsageDurationUnit } from "@/lib/product-form";
import { isSlugTaken } from "@/lib/product-store";
import { Product, ProductAccountType } from "@/lib/types";

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
        | "retailPrice"
        | "tierPrices"
        | "customerTierPrices"
        | "warrantyMonths"
        | "category"
        | "categories"
        | "accountType"
        | "featured"
        | "isFlashSale"
        | "flashSaleLabel"
        | "published"
      >;
    }
  | { ok: false; error: string };

const parseDisplayMoney = (value: string) => Number.parseFloat(value.replace(/,/g, ""));

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
  const customerRegularPrice = parseStoredMoney(values.customerRegularPrice, currencySettings);
  const customerVipPrice = parseStoredMoney(values.customerVipPrice, currencySettings);
  const ctvRegularPrice = parseStoredMoney(values.ctvRegularPrice, currencySettings);
  const ctvVipPrice = parseStoredMoney(values.ctvVipPrice, currencySettings);
  const warrantyMonths = Number(values.warrantyMonths);

  const numericValues = [
    costPrice,
    customerRegularPrice,
    customerVipPrice,
    ctvRegularPrice,
    ctvVipPrice
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
      retailPrice: customerRegularPrice ?? 0,
      tierPrices: {
        regular: ctvRegularPrice ?? 0,
        vip: ctvVipPrice ?? 0
      },
      customerTierPrices: {
        regular: customerRegularPrice ?? 0,
        vip: customerVipPrice ?? 0
      },
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
