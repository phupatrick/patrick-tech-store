import { CurrencySettings, formatCurrency } from "@/lib/currency";
import { Language, translate } from "@/lib/i18n";
import { getOrderCleanupDate } from "@/lib/order-store";
import { Order } from "@/lib/types";

type AdminOrdersTableProps = {
  orders: Order[];
  language: Language;
  currencySettings: CurrencySettings;
};

const formatDateTime = (value: string | Date, language: Language) =>
  new Intl.DateTimeFormat(language === "en" ? "en-US" : "vi-VN", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(value instanceof Date ? value : new Date(value));

const formatDate = (value: string, language: Language) =>
  new Intl.DateTimeFormat(language === "en" ? "en-US" : "vi-VN", {
    dateStyle: "short"
  }).format(new Date(`${value}T00:00:00`));

export function AdminOrdersTable({ orders, language, currencySettings }: AdminOrdersTableProps) {
  const t = (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) =>
    translate(language, key, params);

  return (
    <section className="surface page-stack">
      <div className="section-head">
        <div>
          <h2 className="section-title">{t("admin.orders.table.title")}</h2>
          <p className="muted">{t("admin.orders.table.description")}</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="notice">{t("admin.orders.table.empty")}</div>
      ) : (
        <div className="admin-cards-grid admin-orders-list">
          {orders.map((order) => {
            const financialItems = [
              typeof order.finalPrice === "number"
                ? t("admin.orders.table.revenue", { amount: formatCurrency(order.finalPrice, currencySettings) })
                : null,
              typeof order.costPrice === "number"
                ? t("admin.orders.table.cost", { amount: formatCurrency(order.costPrice, currencySettings) })
                : null,
              typeof order.profit === "number"
                ? t("admin.orders.table.profit", { amount: formatCurrency(order.profit, currencySettings) })
                : null
            ].filter((item): item is string => Boolean(item));

            return (
              <article key={order.id} className="admin-item-card admin-order-card">
                <div className="admin-item-card-head">
                  <div className="admin-item-card-copy">
                    <p className="eyebrow">{t("admin.orders.table.header.id")}</p>
                    <p className="card-title order-code-text">{order.id}</p>
                    {order.warrantyCode ? (
                      <p className="muted">{t("admin.orders.table.lookupCode", { code: order.warrantyCode })}</p>
                    ) : null}
                  </div>
                  <span className={`pill${order.status === "active" ? "" : " pill-muted"}`}>
                    {t(`admin.orders.table.status.${order.status}` as const)}
                  </span>
                </div>

                <div className="admin-item-meta-grid">
                  <div className="admin-item-meta-block">
                    <p className="eyebrow">{t("admin.orders.table.header.name")}</p>
                    <p className="card-title">{order.name}</p>
                    <p className="muted">{t("admin.orders.table.purchasedAt", { date: formatDate(order.purchaseDate, language) })}</p>
                    {order.customerAddress ? (
                      <p className="muted">{t("admin.orders.table.location", { address: order.customerAddress })}</p>
                    ) : null}
                    {order.customerIp ? <p className="muted">{t("admin.orders.table.ip", { ip: order.customerIp })}</p> : null}
                  </div>

                  <div className="admin-item-meta-block">
                    <p className="eyebrow">{t("admin.orders.table.header.createdAt")}</p>
                    <p className="muted">{formatDateTime(order.createdAt, language)}</p>
                    <p className="muted">
                      {t("admin.orders.table.header.warrantyUntil")}: {formatDate(order.warrantyUntil, language)}
                    </p>
                    <p className="muted">
                      {t("admin.orders.table.header.deleteAfter")}: {formatDateTime(getOrderCleanupDate(order.warrantyUntil), language)}
                    </p>
                  </div>
                </div>

                {financialItems.length > 0 ? (
                  <div className="admin-order-financials">
                    {financialItems.map((item) => (
                      <span key={item} className="admin-metric-pill">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="detail-copy-block">
                  <p className="detail-copy-label">{t("admin.orders.table.header.content")}</p>
                  <div className="order-content">{order.content}</div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
