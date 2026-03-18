import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/auth";
import { getCurrencySettings } from "@/lib/currency";
import { getRequestLanguage } from "@/lib/i18n/server";
import { removeStoredProductImage, resolveProductImageFromFormData } from "@/lib/product-images";
import { getProductValuesFromFormData, validateProductValues } from "@/lib/product-validation";
import { deleteProductRecord, getProductById, updateProductRecord } from "@/lib/product-store";

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const adminUser = await getAdminUser();

  if (!adminUser) {
    return unauthorized();
  }

  const { id } = await context.params;
  const product = getProductById(id);

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ product });
}

export async function PATCH(request: Request, context: RouteContext) {
  const adminUser = await getAdminUser();

  if (!adminUser) {
    return unauthorized();
  }

  const { id } = await context.params;
  const product = getProductById(id);
  const language = await getRequestLanguage();
  const currencySettings = await getCurrencySettings(language);

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const values = getProductValuesFromFormData(formData);
  const validation = validateProductValues(values, language, currencySettings, id);

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const imageResult = await resolveProductImageFromFormData({
    formData,
    slug: validation.data.slug,
    currentImagePath: product.image,
    requireImage: false,
    language
  });

  if (!imageResult.ok) {
    return NextResponse.json({ error: imageResult.error }, { status: 400 });
  }

  const updated = updateProductRecord(
    id,
    {
      ...validation.data,
      image: imageResult.imagePath
    },
    language
  );

  if (product.image !== imageResult.imagePath) {
    removeStoredProductImage(product.image);
  }

  return NextResponse.json({ product: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const adminUser = await getAdminUser();

  if (!adminUser) {
    return unauthorized();
  }

  const { id } = await context.params;
  const product = getProductById(id);
  const deleted = deleteProductRecord(id);

  if (!deleted) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  removeStoredProductImage(product?.image);
  return NextResponse.json({ success: true });
}
