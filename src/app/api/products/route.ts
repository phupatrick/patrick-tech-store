import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { resolveCurrencyCode } from "@/lib/currency";
import { detectLanguageFromHeaders, isLanguage, LANGUAGE_COOKIE_NAME } from "@/lib/i18n";
import { getFilteredPublicProducts } from "@/lib/pricing";

export async function GET(request: NextRequest) {
  const cookieLanguage = request.cookies.get(LANGUAGE_COOKIE_NAME)?.value;
  const language = isLanguage(cookieLanguage)
    ? cookieLanguage
    : detectLanguageFromHeaders(request.headers.get("x-vercel-ip-country"), request.headers.get("accept-language"));
  const currency = resolveCurrencyCode(language, request.cookies.get("preferred-currency")?.value);
  const session = await getAuthSession();
  const searchParams = request.nextUrl.searchParams;
  const products = (
    await getFilteredPublicProducts({
      language,
      currency,
      query: searchParams.get("q") ?? "",
      category: searchParams.get("category") ?? "",
      sort: searchParams.get("sort") ?? "relevant",
      session
    })
  ).map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    image: product.image,
    shortDescription: product.shortDescription,
    fullDescription: product.fullDescription,
    usageDuration: product.usageDuration,
    warrantyDuration: product.warrantyDuration,
    retailPrice: product.retailPrice,
    customerRegularPrice: product.customerRegularPrice,
    visiblePrice: product.visiblePrice,
    displayCurrency: product.displayCurrency,
    displayRetailPrice: product.displayRetailPrice,
    displayCustomerRegularPrice: product.displayCustomerRegularPrice,
    displayVisiblePrice: product.displayVisiblePrice,
    category: product.category,
    flashSaleLabel: product.flashSaleLabel
  }));

  return NextResponse.json(
    {
      audience: "public",
      count: products.length,
      products
    },
    {
      headers: {
        "cache-control": "private, no-store, max-age=0, must-revalidate"
      }
    }
  );
}
