"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminUser } from "@/lib/auth";
import { getCurrencySettings } from "@/lib/currency";
import { getRequestCurrency } from "@/lib/currency/server";
import { translate } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n/server";
import { ProductFormState } from "@/lib/product-form";
import { removeStoredProductImage, resolveProductImageFromFormData } from "@/lib/product-images";
import { getProductValuesFromFormData, validateProductValues } from "@/lib/product-validation";
import { createProductRecord, deleteProductRecord, getProductById, updateProductRecord } from "@/lib/product-store";
import { CurrencyCode, Product, ProductPriceSet } from "@/lib/types";

const revalidateProductViews = () => {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  revalidatePath("/reseller");
  revalidatePath("/api/products");
};

type CurrencyPriceOverrideInput = {
  currency: CurrencyCode;
  prices: ProductPriceSet;
};

const mergeCurrencyPrices = (
  existingPrices: Product["currencyPrices"],
  nextOverride?: CurrencyPriceOverrideInput
) => {
  if (!nextOverride) {
    return existingPrices;
  }

  return {
    ...(existingPrices ?? {}),
    [nextOverride.currency]: {
      retailPrice: nextOverride.prices.retailPrice,
      customerTierPrices: nextOverride.prices.customerTierPrices,
      tierPrices: nextOverride.prices.tierPrices
    }
  };
};

export const createProductAction = async (_prevState: ProductFormState, formData: FormData): Promise<ProductFormState> => {
  await requireAdminUser("/admin/products/new");
  const language = await getRequestLanguage();
  const currency = await getRequestCurrency(language);
  const currencySettings = await getCurrencySettings(language, currency);
  const values = getProductValuesFromFormData(formData);
  const validation = validateProductValues(values, language, currencySettings);

  if (!validation.ok) {
    return { error: validation.error, values };
  }

  const imageResult = await resolveProductImageFromFormData({
    formData,
    slug: validation.data.slug,
    currentImagePath: "",
    requireImage: true,
    language
  });

  if (!imageResult.ok) {
    return { error: imageResult.error, values };
  }

  createProductRecord(
    {
      name: validation.data.name,
      slug: validation.data.slug,
      shortDescription: validation.data.shortDescription,
      fullDescription: validation.data.fullDescription,
      usageDuration: validation.data.usageDuration,
      costPrice: validation.data.costPrice,
      image: imageResult.imagePath,
      retailPrice: validation.data.vndPricing.retailPrice,
      customerTierPrices: validation.data.vndPricing.customerTierPrices,
      tierPrices: validation.data.vndPricing.tierPrices,
      warrantyMonths: validation.data.warrantyMonths,
      category: validation.data.category,
      categories: validation.data.categories,
      accountType: validation.data.accountType,
      featured: validation.data.featured,
      isFlashSale: validation.data.isFlashSale,
      flashSaleLabel: validation.data.flashSaleLabel,
      published: validation.data.published,
      currencyPrices: mergeCurrencyPrices(undefined, validation.data.currencyPriceOverride)
    },
    language
  );
  revalidateProductViews();
  redirect("/admin/products");
};

export const updateProductAction = async (
  productId: string,
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> => {
  await requireAdminUser(`/admin/products/${productId}/edit`);
  const language = await getRequestLanguage();
  const currency = await getRequestCurrency(language);
  const currencySettings = await getCurrencySettings(language, currency);
  const values = getProductValuesFromFormData(formData);
  const validation = validateProductValues(values, language, currencySettings, productId);

  if (!validation.ok) {
    return { error: validation.error, values };
  }

  const product = getProductById(productId);

  if (!product) {
    return { error: translate(language, "admin.validation.productNotFound"), values };
  }

  const imageResult = await resolveProductImageFromFormData({
    formData,
    slug: validation.data.slug,
    currentImagePath: product.image,
    requireImage: false,
    language
  });

  if (!imageResult.ok) {
    return { error: imageResult.error, values };
  }

  updateProductRecord(
    productId,
    {
      name: validation.data.name,
      slug: validation.data.slug,
      shortDescription: validation.data.shortDescription,
      fullDescription: validation.data.fullDescription,
      usageDuration: validation.data.usageDuration,
      costPrice: validation.data.costPrice,
      image: imageResult.imagePath,
      retailPrice: currency === "USD" ? product.retailPrice : validation.data.vndPricing.retailPrice,
      customerTierPrices: currency === "USD" ? product.customerTierPrices : validation.data.vndPricing.customerTierPrices,
      tierPrices: currency === "USD" ? product.tierPrices : validation.data.vndPricing.tierPrices,
      warrantyMonths: validation.data.warrantyMonths,
      category: validation.data.category,
      categories: validation.data.categories,
      accountType: validation.data.accountType,
      featured: validation.data.featured,
      isFlashSale: validation.data.isFlashSale,
      flashSaleLabel: validation.data.flashSaleLabel,
      published: validation.data.published,
      currencyPrices: mergeCurrencyPrices(product.currencyPrices, validation.data.currencyPriceOverride)
    },
    language
  );

  if (product.image !== imageResult.imagePath) {
    removeStoredProductImage(product.image);
  }

  revalidateProductViews();
  revalidatePath(`/admin/products/${productId}/edit`);
  redirect("/admin/products");
};

export const deleteProductAction = async (productId: string) => {
  await requireAdminUser("/admin/products");
  const product = getProductById(productId);
  deleteProductRecord(productId);
  removeStoredProductImage(product?.image);
  revalidateProductViews();
};
