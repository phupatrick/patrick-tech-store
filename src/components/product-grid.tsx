"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";

import { useCurrency } from "@/components/currency-provider";
import { useI18n } from "@/components/i18n-provider";
import { getRenderableProductImageSrc, isInlineImageSrc } from "@/lib/product-image-src";
import { getProductPriceSummary, getPublicPriceLabels } from "@/lib/product-price-display";
import { AuthSession, ProductView, VoucherView } from "@/lib/types";

type ProductGridProps = {
  products: ProductView[];
  variant?: "public" | "internal";
  session?: AuthSession;
  vouchers?: VoucherView[];
  priorityCount?: number;
};

type ActivePanelMode = "detail" | "checkout";
const ProductGridDialog = dynamic(() => import("@/components/product-grid-dialog").then((module) => module.ProductGridDialog));

const getProductCategories = (product: Pick<ProductView, "category" | "categories">) =>
  product.categories ?? (product.category ? [product.category] : []);

export function ProductGrid({
  products,
  variant = "internal",
  session,
  vouchers = [],
  priorityCount = 0
}: ProductGridProps) {
  const { language, t } = useI18n();
  const { format, formatDisplay } = useCurrency();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [activeProduct, setActiveProduct] = useState<ProductView | null>(null);
  const [activePanelMode, setActivePanelMode] = useState<ActivePanelMode>("detail");
  const isPublic = variant === "public";
  const isVoucherEligible = Boolean(session && ["customer", "reseller"].includes(session.role));
  const detailLabel = t("product.details");
  const priceLabels = getPublicPriceLabels(language);

  const handleCheckout = async (product: ProductView, voucherId?: string) => {
    setPendingId(product.id);

    try {
      const { openCheckoutWindow } = await import("@/lib/client-checkout");
      const result = await openCheckoutWindow({
        productId: product.id,
        voucherId,
        language,
        fallbackError: t("checkout.error.generic")
      });
      if (result.ok) {
        setActiveProduct(null);
        setActivePanelMode("detail");
      }
    } finally {
      setPendingId(null);
    }
  };

  const openProductDetail = (product: ProductView) => {
    setActiveProduct(product);
    setActivePanelMode("detail");
  };

  const openProductCheckout = (product: ProductView) => {
    setActiveProduct(product);
    setActivePanelMode("checkout");
  };

  const closeActivePanel = () => {
    setActiveProduct(null);
    setActivePanelMode("detail");
  };

  return (
    <>
      <div className={`product-grid${isPublic ? " product-grid-public" : ""}`}>
        {products.map((product, index) => {
          const productCategories = getProductCategories(product);
          const imageSrc = getRenderableProductImageSrc(product.image);
          const useUnoptimizedImage = isInlineImageSrc(imageSrc);
          const priceSummary = getProductPriceSummary(product);
          const shouldPrioritizeImage = index < priorityCount;

          return (
            <article key={product.id} className={`card${isPublic ? " product-card-public" : ""}`}>
              <div className={`card-image${isPublic ? " card-image-public" : ""}`}>
                <div className={`product-image-frame${isPublic ? " product-image-frame-public" : ""}`}>
                  <Image
                    src={imageSrc}
                    alt={product.name}
                    fill
                    className={`product-image${isPublic ? " product-image-public" : ""}`}
                    sizes={isPublic ? "(max-width: 720px) 260px, (max-width: 1080px) 280px, 300px" : "320px"}
                    quality={95}
                    priority={shouldPrioritizeImage}
                    unoptimized={useUnoptimizedImage}
                  />
                </div>
                {isPublic && product.flashSaleLabel ? <span className="product-offer-badge">{product.flashSaleLabel}</span> : null}
              </div>
              <div className={`card-body${isPublic ? " card-body-public" : ""}`}>
                {isPublic ? (
                  <div className="stack">
                    {productCategories.length > 0 ? (
                      <div className="filter-chip-row">
                        {productCategories.map((category) => (
                          <span key={`${product.id}-${category}`} className="pill product-category-pill">
                            {category}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <h3 className="card-title card-title-public">{product.name}</h3>
                  </div>
                ) : (
                  <div className="stack">
                    <div className="row">
                      <h3 className="card-title">{product.name}</h3>
                      <span className="pill">{product.label}</span>
                    </div>
                    <p className="muted">{product.shortDescription}</p>
                  </div>
                )}

                <div className={isPublic ? "stack public-price-block" : "row"}>
                  <div>
                    {isPublic ? (
                      <div className="product-price-stack" aria-label={language === "vi" ? "Thong tin gia" : "Pricing details"}>
                        {priceSummary.hasDiscount ? (
                          <div className="product-price-topline">
                            <span className="product-price-label">{priceLabels.original}</span>
                            <div className="product-price-topline-values">
                              <span className="product-price-value product-price-original is-struck">
                                {formatDisplay(priceSummary.originalPrice)}
                              </span>
                              <span className="product-price-discount-badge">-{priceSummary.discountPercent}%</span>
                            </div>
                          </div>
                        ) : null}
                        <div className="product-price-row product-price-row-sale product-price-row-compact">
                          <span className="product-price-label product-price-label-strong">{priceLabels.sale}</span>
                          <span className="product-price-value product-price-sale">{formatDisplay(priceSummary.salePrice)}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="price">{format(product.visiblePrice)}</p>
                    )}
                    {!isPublic ? (
                      <p className="meta">
                        {t("product.meta", { months: product.warrantyMonths, points: product.points })}
                      </p>
                    ) : null}
                  </div>
                  {!isPublic ? <span className="meta">{t("product.stock", { count: product.stock })}</span> : null}
                </div>

                {isPublic ? (
                  <div className="product-public-meta" aria-label={language === "vi" ? "Thong tin san pham" : "Product information"}>
                    <div className="product-public-meta-item">
                      <span className="product-public-meta-label">{t("product.usageDuration")}</span>
                      <span className="product-public-meta-value">{product.usageDuration}</span>
                    </div>
                      <div className="product-public-meta-item">
                        <span className="product-public-meta-label">{t("product.warranty")}</span>
                        <span className="product-public-meta-value">{product.warrantyDuration}</span>
                      </div>
                  </div>
                ) : null}

                {isPublic ? (
                  <div className="product-actions">
                    <button type="button" onClick={() => openProductDetail(product)} className="button">
                      {detailLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => openProductCheckout(product)}
                      disabled={pendingId === product.id}
                      className="button button-primary button-public"
                    >
                      {pendingId === product.id ? t("product.routing") : t("product.buyNow")}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleCheckout(product)}
                    disabled={pendingId === product.id}
                    className="button"
                  >
                    {pendingId === product.id ? t("product.routing") : t("product.buyNow")}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {activeProduct ? (
        <ProductGridDialog
          product={activeProduct}
          initialMode={activePanelMode}
          session={session}
          vouchers={vouchers}
          onClose={closeActivePanel}
        />
      ) : null}
    </>
  );
}
