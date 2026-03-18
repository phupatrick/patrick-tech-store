import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/auth";
import { getCurrencySettings } from "@/lib/currency";
import { resolveCurrencyCode } from "@/lib/currency";
import { getRequestLanguage } from "@/lib/i18n/server";
import { resolveProductImageFromFormData } from "@/lib/product-images";
import { getProductValuesFromFormData, validateProductValues } from "@/lib/product-validation";
import { createProductRecord, listProducts } from "@/lib/product-store";

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function GET() {
  const adminUser = await getAdminUser();

  if (!adminUser) {
    return unauthorized();
  }

  return NextResponse.json({ products: listProducts() });
}

export async function POST(request: Request) {
  const adminUser = await getAdminUser();

  if (!adminUser) {
    return unauthorized();
  }

  const language = await getRequestLanguage();
  const currency = resolveCurrencyCode(language, request.headers.get("cookie")?.match(/preferred-currency=([^;]+)/)?.[1] ?? null);
  const currencySettings = await getCurrencySettings(language, currency);
  const formData = await request.formData();
  const values = getProductValuesFromFormData(formData);
  const validation = validateProductValues(values, language, currencySettings);

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const imageResult = await resolveProductImageFromFormData({
    formData,
    slug: validation.data.slug,
    currentImagePath: "",
    requireImage: true,
    language
  });

  if (!imageResult.ok) {
    return NextResponse.json({ error: imageResult.error }, { status: 400 });
  }

  const product = createProductRecord(
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
      currencyPrices: validation.data.currencyPriceOverride
        ? {
            [validation.data.currencyPriceOverride.currency]: {
              retailPrice: validation.data.currencyPriceOverride.prices.retailPrice,
              customerTierPrices: validation.data.currencyPriceOverride.prices.customerTierPrices,
              tierPrices: validation.data.currencyPriceOverride.prices.tierPrices
            }
          }
        : undefined
    },
    language
  );

  return NextResponse.json({ product }, { status: 201 });
}
