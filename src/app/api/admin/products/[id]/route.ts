import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/auth";
import { getCurrencySettings } from "@/lib/currency";
import { resolveCurrencyCode } from "@/lib/currency";
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
  const currency = resolveCurrencyCode(language, request.headers.get("cookie")?.match(/preferred-currency=([^;]+)/)?.[1] ?? null);
  const currencySettings = await getCurrencySettings(language, currency);

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

  const nextCurrencyPrices = validation.data.currencyPriceOverride
    ? {
        ...(product.currencyPrices ?? {}),
        [validation.data.currencyPriceOverride.currency]: {
          retailPrice: validation.data.currencyPriceOverride.prices.retailPrice,
          customerTierPrices: validation.data.currencyPriceOverride.prices.customerTierPrices,
          tierPrices: validation.data.currencyPriceOverride.prices.tierPrices
        }
      }
    : product.currencyPrices;

  const updated = updateProductRecord(
    id,
    {
      name: validation.data.name,
      slug: validation.data.slug,
      shortDescription: validation.data.shortDescription,
      fullDescription: validation.data.fullDescription,
      usageDuration: validation.data.usageDuration,
      costPrice: validation.data.costPrice,
      image: imageResult.imagePath,
      retailPrice: currency === "USD" ? product.retailPrice : validation.data.vndPricing.retailPrice,
      customerTierPrices:
        currency === "USD" ? product.customerTierPrices : validation.data.vndPricing.customerTierPrices,
      tierPrices: currency === "USD" ? product.tierPrices : validation.data.vndPricing.tierPrices,
      warrantyMonths: validation.data.warrantyMonths,
      category: validation.data.category,
      categories: validation.data.categories,
      accountType: validation.data.accountType,
      featured: validation.data.featured,
      isFlashSale: validation.data.isFlashSale,
      flashSaleLabel: validation.data.flashSaleLabel,
      published: validation.data.published,
      currencyPrices: nextCurrencyPrices
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
