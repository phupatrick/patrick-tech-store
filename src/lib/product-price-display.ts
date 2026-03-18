import { Language } from "@/lib/i18n";
import { ProductView } from "@/lib/types";

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

export const getProductPriceSummary = (
  product: Pick<ProductView, "displayRetailPrice" | "displayVisiblePrice">
): ProductPriceSummary => {
  const originalPrice = Math.max(0, product.displayRetailPrice);
  const salePrice = Math.max(0, product.displayVisiblePrice);
  const hasDiscount = originalPrice > 0 && salePrice < originalPrice;
  const discountPercent = hasDiscount ? Math.round(((originalPrice - salePrice) / originalPrice) * 100) : 0;

  return {
    originalPrice,
    salePrice,
    discountPercent,
    hasDiscount
  };
};
