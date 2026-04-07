import { Language } from "@/lib/i18n";
import { normalizeText } from "@/lib/product-categories";
import { AuthSession, ProductView } from "@/lib/types";

type PublicPriceLabels = {
  original: string;
  sale: string;
};

type ProductPriceSummary = {
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  hasDiscount: boolean;
  mode: "priced" | "free" | "contact";
};

export const getPublicPriceLabels = (language: Language): PublicPriceLabels =>
  language === "vi"
    ? {
        original: "Gia goc",
        sale: "Gia ban"
      }
    : {
        original: "Original price",
        sale: "Sale price"
      };

const shouldUseRetailPriceAsReference = (session?: Pick<AuthSession, "role" | "tier" | "vip">) => {
  if (!session || session.role === "admin" || session.role === "deputy_admin" || session.role === "staff") {
    return true;
  }

  if (session.role === "customer") {
    return session.tier === "guest" || !session.vip;
  }

  return false;
};

export const getPublicPriceMode = (
  product: Pick<ProductView, "name" | "slug" | "displayRetailPrice" | "displayVisiblePrice">
): "priced" | "free" | "contact" => {
  const haystack = normalizeText([product.name, product.slug].filter(Boolean).join(" "));

  if (haystack.includes("tai khoan khac") || haystack.includes("custom account request")) {
    return "contact";
  }

  if (Math.max(0, product.displayRetailPrice) <= 0 && Math.max(0, product.displayVisiblePrice) <= 0) {
    return "free";
  }

  return "priced";
};

export const getProductPriceSummary = (
  product: Pick<ProductView, "name" | "slug" | "displayRetailPrice" | "displayVisiblePrice">,
  session?: Pick<AuthSession, "role" | "tier" | "vip">
): ProductPriceSummary => {
  const mode = getPublicPriceMode(product);
  const salePrice = Math.max(0, product.displayVisiblePrice);
  const originalPrice =
    mode === "priced" && shouldUseRetailPriceAsReference(session) ? Math.max(0, product.displayRetailPrice) : salePrice;
  const hasDiscount = originalPrice > 0 && salePrice < originalPrice;
  const discountPercent = hasDiscount ? Math.round(((originalPrice - salePrice) / originalPrice) * 100) : 0;

  return {
    originalPrice,
    salePrice,
    discountPercent,
    hasDiscount,
    mode
  };
};
