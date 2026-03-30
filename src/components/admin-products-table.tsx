import Link from "next/link";

import { deleteProductAction } from "@/app/admin/products/actions";
import { DeleteProductButton } from "@/components/delete-product-button";
import { CurrencySettings, formatCurrencyValue } from "@/lib/currency";
import { Language, translate } from "@/lib/i18n";
import { getLocalizedProductCopy } from "@/lib/product-localization";
import { getDisplayPriceSet } from "@/lib/product-pricing";
import { Product } from "@/lib/types";

type AdminProductsTableProps = {
  products: Product[];
  language: Language;
  currencySettings: CurrencySettings;
  highlightProductId?: string;
  storageLocked?: boolean;
  storageNotice?: string;
};

export function AdminProductsTable({
  products,
  language,
  currencySettings,
  highlightProductId,
  storageLocked = false,
  storageNotice
}: AdminProductsTableProps) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);

  return (
    <section className="surface page-stack">
      <div className="section-head section-head-spread">
        <div>
          <h2 className="section-title">{t("admin.products.table.title")}</h2>
          <p className="muted">{t("admin.products.table.description")}</p>
        </div>
        <Link href="/admin/products/new" className="button button-primary">
          {t("admin.products.table.add")}
        </Link>
      </div>

      {storageNotice ? <div className="notice admin-readonly-notice">{storageNotice}</div> : null}

      <div className="admin-cards-grid">
        {products.map((product) => {
          const localized = getLocalizedProductCopy(product, language);
          const displayPriceSet = getDisplayPriceSet(product, currencySettings);
          const categories =
            localized.categories ??
            (localized.category ? [localized.category] : product.categories ?? (product.category ? [product.category] : []));
          const categoryText = categories.filter(Boolean).join(", ") || t("admin.products.table.uncategorized");

          return (
            <article
              key={product.id}
              id={`product-${product.id}`}
              className={`admin-item-card${highlightProductId === product.id ? " admin-item-card-highlight" : ""}`}
            >
              <div className="admin-item-card-head">
                <div className="admin-item-card-copy">
                  <h3 className="card-title">{localized.name}</h3>
                  <p className="admin-product-meta">/{product.slug}</p>
                </div>
                <p className="price admin-inline-price">{formatCurrencyValue(displayPriceSet.retailPrice, currencySettings)}</p>
              </div>

              <p className="muted admin-item-copy">{localized.shortDescription}</p>

              <div className="admin-item-meta-grid">
                <div className="admin-item-meta-block">
                  <p className="eyebrow">{t("admin.products.table.header.category")}</p>
                  <p className="muted">{categoryText}</p>
                </div>
                <div className="admin-item-meta-block">
                  <p className="eyebrow">{t("admin.products.table.header.status")}</p>
                  <div className="admin-chip-row">
                    <span className={`pill${product.published ? "" : " pill-muted"}`}>
                      {product.published ? t("admin.products.table.published") : t("admin.products.table.hidden")}
                    </span>
                    {product.featured ? <span className="pill">{t("admin.products.table.featured")}</span> : null}
                    {product.isFlashSale ? (
                      <span className="pill">{localized.flashSaleLabel || t("admin.products.table.flashSale")}</span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="admin-row-actions">
                <Link href={`/admin/products/${product.id}/edit`} className="button">
                  {t("admin.products.table.edit")}
                </Link>
                <form action={deleteProductAction.bind(null, product.id)}>
                  <DeleteProductButton productName={localized.name} disabled={storageLocked} />
                </form>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
