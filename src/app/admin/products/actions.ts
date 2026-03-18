"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminUser } from "@/lib/auth";
import { getCurrencySettings } from "@/lib/currency";
import { translate } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n/server";
import { ProductFormState } from "@/lib/product-form";
import { removeStoredProductImage, resolveProductImageFromFormData } from "@/lib/product-images";
import { getProductValuesFromFormData, validateProductValues } from "@/lib/product-validation";
import { createProductRecord, deleteProductRecord, getProductById, updateProductRecord } from "@/lib/product-store";

const revalidateProductViews = () => {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  revalidatePath("/reseller");
  revalidatePath("/api/products");
};

export const createProductAction = async (_prevState: ProductFormState, formData: FormData): Promise<ProductFormState> => {
  await requireAdminUser("/admin/products/new");
  const language = await getRequestLanguage();
  const currencySettings = await getCurrencySettings(language);
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
      ...validation.data,
      image: imageResult.imagePath
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
  const currencySettings = await getCurrencySettings(language);
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
      ...validation.data,
      image: imageResult.imagePath
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
