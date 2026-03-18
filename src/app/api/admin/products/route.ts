import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/auth";
import { getCurrencySettings } from "@/lib/currency";
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
  const currencySettings = await getCurrencySettings(language);
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

  const product = createProductRecord({
    ...validation.data,
    image: imageResult.imagePath
  }, language);

  return NextResponse.json({ product }, { status: 201 });
}
