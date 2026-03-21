"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useCurrency } from "@/components/currency-provider";
import { useI18n } from "@/components/i18n-provider";
import { getLocalizedWarrantyDuration } from "@/lib/product-localization";
import { getProductPriceSummary, getPublicPriceLabels } from "@/lib/product-price-display";
import { AuthSession, ProductView, VoucherView } from "@/lib/types";
import { calculateVoucherDiscount } from "@/lib/vouchers";

type ProductGridDialogProps = {
  product: ProductView;
  initialMode: "detail" | "checkout";
  session?: AuthSession;
  vouchers?: VoucherView[];
  onClose: () => void;
};

const getProductCategories = (product: Pick<ProductView, "category" | "categories">) =>
  product.categories ?? (product.category ? [product.category] : []);

export function ProductGridDialog({
  product,
  initialMode,
  session,
  vouchers = [],
  onClose
}: ProductGridDialogProps) {
  const { language, t } = useI18n();
  const { format, formatDisplay, toDisplayAmount } = useCurrency();
  const [panelMode, setPanelMode] = useState<"detail" | "checkout">(initialMode);
  const [selectedVoucherId, setSelectedVoucherId] = useState("");
  const [pending, setPending] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const isVoucherEligible = Boolean(session && ["customer", "reseller"].includes(session.role));
  const productCategories = getProductCategories(product);
  const priceLabels = getPublicPriceLabels(language);
  const priceSummary = getProductPriceSummary(product);
  const reservedUntilFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === "en" ? "en-US" : "vi-VN", {
        dateStyle: "short",
        timeStyle: "short"
      }),
    [language]
  );

  useEffect(() => {
    setPanelMode(initialMode);
    setSelectedVoucherId("");
    setPending(false);
    setCheckoutError(null);
  }, [initialMode, product.id]);

  const activeVoucherOptions = useMemo(
    () =>
      vouchers.map((voucher) => {
        const discountAmount = calculateVoucherDiscount(voucher.definitionId, product.visiblePrice);
        return {
          ...voucher,
          discountAmount,
          isApplicable: discountAmount > 0,
          isReserved: Boolean(voucher.reservedUntil)
        };
      }),
    [product.visiblePrice, vouchers]
  );

  const selectedVoucher = activeVoucherOptions.find(
    (voucher) => voucher.id === selectedVoucherId && voucher.isApplicable && !voucher.isReserved
  );
  const finalDisplayPrice = Math.max(0, product.displayVisiblePrice - toDisplayAmount(selectedVoucher?.discountAmount ?? 0));
  const showZaloChannel = language === "vi";
  const showWhatsappChannel = language === "en";
  const checkoutChannelDescription = language === "vi"
    ? "Chọn kênh bạn muốn dùng để gửi sẵn nội dung đặt hàng."
    : "Choose the app you want to use for this order request.";

  const handleCheckout = async (contactMethod: "zalo" | "telegram" | "whatsapp", voucherId?: string) => {
    setPending(true);
    setCheckoutError(null);

    try {
      const { openCheckoutWindow } = await import("@/lib/client-checkout");
      const result = await openCheckoutWindow({
        productId: product.id,
        voucherId,
        contactMethod,
        language,
        fallbackError: t("checkout.error.generic")
      });

      if (!result.ok) {
        setCheckoutError(result.error);
        return;
      }

      onClose();
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className="detail-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-detail-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="detail-panel">
        <div className="row detail-panel-header">
          <div className="stack">
            <p className="eyebrow">{panelMode === "checkout" ? t("product.buyNow") : t("product.detailsTitle")}</p>
            <h3 id="product-detail-title" className="section-title">
              {product.name}
            </h3>
          </div>
          <button type="button" className="button" onClick={onClose}>
            {t("product.close")}
          </button>
        </div>

        <div className="detail-panel-copy">
          {productCategories.length > 0 ? (
            <div className="filter-chip-row">
              {productCategories.map((category) => (
                <span key={`${product.id}-${category}`} className="pill product-category-pill">
                  {category}
                </span>
              ))}
            </div>
          ) : null}

          <div className="product-price-stack product-price-stack-detail" aria-label={language === "vi" ? "Thong tin gia" : "Pricing details"}>
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

          <div className="product-public-meta product-public-meta-detail">
            <div className="product-public-meta-item">
              <span className="product-public-meta-label">{t("product.usageDuration")}</span>
              <span className="product-public-meta-value">{product.usageDuration}</span>
            </div>
            <div className="product-public-meta-item">
              <span className="product-public-meta-label">{t("product.warranty")}</span>
              <span className="product-public-meta-value">
                {getLocalizedWarrantyDuration(product.warrantyMonths, language)}
              </span>
            </div>
          </div>

          <div className="detail-summary">
            <p className="detail-copy-label">{t("product.summary")}</p>
            <p className="muted">{product.shortDescription}</p>
          </div>

          {panelMode === "detail" ? (
            <div className="detail-copy-block">
              <p className="detail-copy-label">{t("product.fullDescription")}</p>
              <div className="detail-description">{product.fullDescription}</div>
            </div>
          ) : null}

          {panelMode === "checkout" && isVoucherEligible ? (
            <div className="voucher-picker">
              <div className="row row-space">
                <div>
                  <p className="detail-copy-label">{t("checkout.voucherSectionTitle")}</p>
                  <p className="muted">{t("checkout.voucherSectionDescription")}</p>
                </div>
                <Link href="/vouchers" className="button">
                  {t("voucher.nav")}
                </Link>
              </div>

              <div className="voucher-picker-list">
                <button
                  type="button"
                  className={`voucher-option${selectedVoucherId ? "" : " selected"}`}
                  onClick={() => setSelectedVoucherId("")}
                >
                  <span className="card-title">{t("checkout.voucherNoneShort")}</span>
                  <span className="muted">{t("checkout.voucherKeepFullPrice")}</span>
                </button>

                {activeVoucherOptions.length > 0 ? (
                  activeVoucherOptions.map((voucher) => (
                    <button
                      key={voucher.id}
                      type="button"
                      className={`voucher-option${selectedVoucherId === voucher.id ? " selected" : ""}`}
                      disabled={!voucher.isApplicable || voucher.isReserved}
                      onClick={() => setSelectedVoucherId(voucher.id)}
                    >
                      <span className="card-title">{t(`voucher.def.${voucher.definitionId}.name` as never)}</span>
                      <span className="muted">{t(`voucher.def.${voucher.definitionId}.description` as never)}</span>
                      <span className="voucher-meta">
                        {voucher.discountAmount > 0
                          ? t("checkout.voucherDiscount", { amount: format(voucher.discountAmount) })
                          : t("checkout.voucherMinimumNotMet")}
                      </span>
                      {voucher.isReserved && voucher.reservedUntil ? (
                        <span className="muted">
                          {t("voucher.status.reservedUntil", {
                            date: reservedUntilFormatter.format(new Date(voucher.reservedUntil))
                          })}
                        </span>
                      ) : null}
                    </button>
                  ))
                ) : (
                  <div className="notice">{t("checkout.voucherWalletEmpty")}</div>
                )}
              </div>

            </div>
          ) : null}

          {panelMode === "checkout" ? (
            <div className="checkout-channel-panel">
              <div className="checkout-summary-card">
                <div className="checkout-summary-row">
                  <span>{t("checkout.originalPrice")}</span>
                  <strong>{formatDisplay(product.displayVisiblePrice)}</strong>
                </div>
                <div className="checkout-summary-row">
                  <span>{t("checkout.discount")}</span>
                  <strong>{format(selectedVoucher?.discountAmount ?? 0)}</strong>
                </div>
                <div className="checkout-summary-row checkout-summary-row-total">
                  <span>{t("checkout.finalPrice")}</span>
                  <strong>{formatDisplay(finalDisplayPrice)}</strong>
                </div>
              </div>

              <div className="detail-copy-block">
                <p className="detail-copy-label">{t("checkout.channelTitle")}</p>
                <p className="muted">{checkoutChannelDescription}</p>
              </div>

              <div className="checkout-channel-actions">
                {showZaloChannel ? (
                  <button
                    type="button"
                    onClick={() => handleCheckout("zalo", selectedVoucher?.id)}
                    disabled={pending}
                    className="button button-primary"
                  >
                    {pending ? t("product.routing") : t("checkout.channel.zalo")}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleCheckout("telegram", selectedVoucher?.id)}
                  disabled={pending}
                  className="button"
                >
                  {pending ? t("product.routing") : t("checkout.channel.telegram")}
                </button>
                {showWhatsappChannel ? (
                  <button
                    type="button"
                    onClick={() => handleCheckout("whatsapp", selectedVoucher?.id)}
                    disabled={pending}
                    className="button"
                  >
                    {pending ? t("product.routing") : t("checkout.channel.whatsapp")}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {checkoutError ? <div className="admin-form-error">{checkoutError}</div> : null}
        </div>

        <div className="product-actions">
          {panelMode === "detail" ? (
            <button
              type="button"
              onClick={() => setPanelMode("checkout")}
              disabled={pending}
              className="button button-primary"
            >
              {pending ? t("product.routing") : t("product.buyNow")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setPanelMode("detail")}
              disabled={pending}
              className="button"
            >
              {t("product.details")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
