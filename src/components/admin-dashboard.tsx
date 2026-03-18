"use client";

import { useState } from "react";

import { useCurrency } from "@/components/currency-provider";
import { useI18n } from "@/components/i18n-provider";
import { getProductName } from "@/lib/i18n";
import { getDisplayPriceSet } from "@/lib/product-pricing";
import { Product, User } from "@/lib/types";

type AdminDashboardProps = {
  products: Product[];
  users: User[];
};

export function AdminDashboard({ products, users }: AdminDashboardProps) {
  const { language, t } = useI18n();
  const { format, formatDisplay, settings } = useCurrency();
  const [selectedProduct, setSelectedProduct] = useState(products[0]?.id ?? "");
  const [selectedUser, setSelectedUser] = useState(users[1]?.id ?? "");

  const product = products.find((item) => item.id === selectedProduct) ?? products[0];
  const user = users.find((item) => item.id === selectedUser) ?? users[1];
  const displayPriceSet = product ? getDisplayPriceSet(product, settings) : undefined;
  const productOverrides = Object.entries(product?.overridePrices ?? {}).filter(
    (entry): entry is [string, number] => typeof entry[1] === "number"
  );
  const userOverrides = Object.entries(user?.overridePriceMap ?? {}).filter(
    (entry): entry is [string, number] => typeof entry[1] === "number"
  );

  return (
    <div className="page-stack">
      <section className="stats-grid">
        <div className="stat-card">
          <p className="eyebrow">{t("admin.stats.products")}</p>
          <p className="price">{products.length}</p>
        </div>
        <div className="stat-card">
          <p className="eyebrow">{t("admin.stats.users")}</p>
          <p className="price">{users.length}</p>
        </div>
        <div className="stat-card">
          <p className="eyebrow">{t("admin.stats.tiers")}</p>
          <p className="price">2</p>
        </div>
        <div className="stat-card">
          <p className="eyebrow">{t("admin.stats.points")}</p>
          <p className="price">{users.reduce((sum, item) => sum + item.points, 0)}</p>
        </div>
      </section>

      <section className="admin-grid">
        <div className="surface">
          <div className="section-head">
            <div>
              <h2 className="section-title">{t("admin.productMatrix.title")}</h2>
              <p className="muted">{t("admin.productMatrix.description")}</p>
            </div>
            <select value={selectedProduct} onChange={(event) => setSelectedProduct(event.target.value)} className="select">
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {getProductName(language, item.id)}
                </option>
              ))}
            </select>
          </div>

          {product && (
            <div className="detail-grid">
              <div className="detail-card">
                <p className="eyebrow">{t("admin.form.field.costPrice")}</p>
                <p className="price">{format(product.costPrice)}</p>
              </div>
              <div className="detail-card">
                <p className="eyebrow">{t("admin.productMatrix.points")}</p>
                <p className="price">{product.points}</p>
              </div>
              <div className="detail-card">
                <p className="eyebrow">{t("admin.form.field.customerRegularPrice")}</p>
                <p className="price">{displayPriceSet ? formatDisplay(displayPriceSet.retailPrice) : "-"}</p>
              </div>
              <div className="detail-card">
                <p className="eyebrow">{t("admin.form.field.customerVipPrice")}</p>
                <p className="price">{displayPriceSet ? formatDisplay(displayPriceSet.customerTierPrices.vip) : "-"}</p>
              </div>
              <div className="detail-card">
                <p className="eyebrow">{t("admin.form.field.ctvRegularPrice")}</p>
                <p className="price">{displayPriceSet ? formatDisplay(displayPriceSet.tierPrices.regular) : "-"}</p>
              </div>
              <div className="detail-card">
                <p className="eyebrow">{t("admin.form.field.ctvVipPrice")}</p>
                <p className="price">{displayPriceSet ? formatDisplay(displayPriceSet.tierPrices.vip) : "-"}</p>
              </div>
              <div className="detail-card">
                <p className="eyebrow">{t("admin.productMatrix.overrides")}</p>
                <p className="muted">
                  {productOverrides.length > 0
                    ? productOverrides.map(([userId, price]) => `${userId}: ${format(price)}`).join(" / ")
                    : t("admin.productMatrix.noOverrides")}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="page-stack">
          <div className="surface">
            <div className="section-head">
              <div>
                <h2 className="section-title">{t("admin.userControls.title")}</h2>
                <p className="muted">{t("admin.userControls.description")}</p>
              </div>
              <select value={selectedUser} onChange={(event) => setSelectedUser(event.target.value)} className="select">
                {users.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            {user && (
              <div className="page-stack">
                <div className="detail-card">
                  <p className="eyebrow">{t("admin.userControls.user")}</p>
                  <p className="card-title">{user.name}</p>
                  <p>{user.phone}</p>
                </div>
                <div className="detail-card">
                  <p className="eyebrow">{t("admin.userControls.tier")}</p>
                  <p className="card-title">{t(`tier.${user.tier}` as const)}</p>
                </div>
                <div className="detail-card">
                  <p className="eyebrow">{t("admin.userControls.points")}</p>
                  <p className="card-title">{user.points}</p>
                </div>
                <div className="detail-card">
                  <p className="eyebrow">{t("admin.userControls.overrides")}</p>
                  <p className="muted">
                    {userOverrides.length > 0
                      ? userOverrides
                          .map(([productId, price]) => `${getProductName(language, productId)}: ${format(price)}`)
                          .join(" / ")
                      : t("admin.userControls.noOverrides")}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="notice">
            <h3 className="card-title">{t("admin.persistence.title")}</h3>
            <p className="muted">{t("admin.persistence.description")}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
