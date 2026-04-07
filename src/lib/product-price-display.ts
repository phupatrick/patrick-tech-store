import { Language } from "@/lib/i18n";
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

export const getProductPriceSummary = (
  product: Pick<ProductView, "displayRetailPrice" | "displayVisiblePrice">,
  session?: Pick<AuthSession, "role" | "tier" | "vip">
): ProductPriceSummary => {
  const salePrice = Math.max(0, product.displayVisiblePrice);
  const originalPrice = shouldUseRetailPriceAsReference(session) ? Math.max(0, product.displayRetailPrice) : salePrice;
  const hasDiscount = originalPrice > 0 && salePrice < originalPrice;
  const discountPercent = hasDiscount ? Math.round(((originalPrice - salePrice) / originalPrice) * 100) : 0;

  return {
    originalPrice,
    salePrice,
    discountPercent,
    hasDiscount
  };
};
