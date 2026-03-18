import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { detectLanguageFromHeaders, isLanguage, LANGUAGE_COOKIE_NAME } from "@/lib/i18n";
import { getFilteredPublicProducts } from "@/lib/pricing";

export async function GET(request: NextRequest) {
  const cookieLanguage = request.cookies.get(LANGUAGE_COOKIE_NAME)?.value;
  const language = isLanguage(cookieLanguage)
    ? cookieLanguage
    : detectLanguageFromHeaders(request.headers.get("x-vercel-ip-country"), request.headers.get("accept-language"));
  const session = await getAuthSession();
  const searchParams = request.nextUrl.searchParams;
  const products = getFilteredPublicProducts({
    language,
    query: searchParams.get("q") ?? "",
    category: searchParams.get("category") ?? "",
    sort: searchParams.get("sort") ?? "relevant",
    session
  }).map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    image: product.image,
    shortDescription: product.shortDescription,
    fullDescription: product.fullDescription,
    retailPrice: product.retailPrice,
    customerRegularPrice: product.customerRegularPrice,
    visiblePrice: product.visiblePrice,
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
