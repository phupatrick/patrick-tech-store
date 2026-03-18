import Image from "next/image";
import Link from "next/link";

import { deleteProductAction } from "@/app/admin/products/actions";
import { DeleteProductButton } from "@/components/delete-product-button";
import { CurrencySettings, formatCurrency } from "@/lib/currency";
import { Language, translate } from "@/lib/i18n";
import { getLocalizedProductCopy, getLocalizedUsageDuration, getLocalizedWarrantyDuration } from "@/lib/product-localization";
import { getProductImageSrc, isInlineImageSrc } from "@/lib/product-image-src";
import { Product, ProductAccountType } from "@/lib/types";

type AdminInventoryTableProps = {
  products: Product[];
  language: Language;
  currencySettings: CurrencySettings;
};

export function AdminInventoryTable({ products, language, currencySettings }: AdminInventoryTableProps) {
  const t = (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) =>
    translate(language, key, params);
  const accountTypeLabels: Record<ProductAccountType, string> = {
    dedicated: t("admin.form.accountType.dedicated"),
    primary: t("admin.form.accountType.primary"),
    rental: t("admin.form.accountType.rental")
  };

  return (
    <section className="surface page-stack">
      <div className="section-head section-head-spread">
        <div>
          <h2 className="section-title">{t("admin.inventory.table.title")}</h2>
          <p className="muted">{t("admin.inventory.table.description")}</p>
        </div>
        <div className="row row-actions">
          <Link href="/admin/products" className="button">
            {t("admin.inventory.table.openProducts")}
          </Link>
          <Link href="/admin/products/new" className="button button-primary">
            {t("admin.inventory.table.addProduct")}
          </Link>
        </div>
      </div>

      <div className="inventory-table-shell">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>{t("admin.inventory.table.header.index")}</th>
              <th>{t("admin.inventory.table.header.image")}</th>
              <th>{t("admin.inventory.table.header.name")}</th>
              <th>{t("admin.inventory.table.header.usageDuration")}</th>
              <th>{t("admin.inventory.table.header.costPrice")}</th>
              <th>{t("admin.inventory.table.header.customerRegular")}</th>
              <th>{t("admin.inventory.table.header.customerVip")}</th>
              <th>{t("admin.inventory.table.header.ctvRegular")}</th>
              <th>{t("admin.inventory.table.header.ctvVip")}</th>
              <th>{t("admin.inventory.table.header.warrantyMonths")}</th>
              <th>{t("admin.inventory.table.header.shortDescription")}</th>
              <th>{t("admin.inventory.table.header.fullDescription")}</th>
              <th>{t("admin.inventory.table.header.accountType")}</th>
              <th>{t("admin.inventory.table.header.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => {
              const localized = getLocalizedProductCopy(product, language);
              const imageSrc = getProductImageSrc(product.image);

              return (
                <tr key={product.id}>
                  <td>{index + 1}</td>
                  <td>
                    <div className="inventory-image-cell">
                      <Image
                        src={imageSrc}
                        alt={localized.name}
                        width={72}
                        height={72}
                        className="inventory-image"
                        sizes="72px"
                        unoptimized={isInlineImageSrc(imageSrc)}
                      />
                    </div>
                  </td>
                  <td className="inventory-name-cell">
                    <div className="inventory-text-block">
                      <strong>{localized.name}</strong>
                      <span>/{product.slug}</span>
                    </div>
                  </td>
                  <td>{getLocalizedUsageDuration(product.usageDuration, language)}</td>
                  <td>{formatCurrency(product.costPrice, currencySettings)}</td>
                  <td>{formatCurrency(product.retailPrice, currencySettings)}</td>
                  <td>{formatCurrency(product.customerTierPrices.vip, currencySettings)}</td>
                  <td>{formatCurrency(product.tierPrices.regular, currencySettings)}</td>
                  <td>{formatCurrency(product.tierPrices.vip, currencySettings)}</td>
                  <td>{getLocalizedWarrantyDuration(product.warrantyMonths, language)}</td>
                  <td className="inventory-description-cell">{localized.shortDescription}</td>
                  <td className="inventory-description-cell inventory-description-long">{localized.fullDescription}</td>
                  <td>{accountTypeLabels[product.accountType]}</td>
                  <td className="inventory-actions-cell">
                    <div className="inventory-actions">
                      <Link href={`/admin/products/${product.id}/edit`} className="button">
                        {t("admin.inventory.table.action.edit")}
                      </Link>
                      <Link href={`/admin/products?focus=${product.id}#product-${product.id}`} className="button">
                        {t("admin.inventory.table.action.openInProducts")}
                      </Link>
                      <form action={deleteProductAction.bind(null, product.id)}>
                        <DeleteProductButton productName={localized.name} />
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
