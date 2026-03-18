import { createOrderAction } from "@/app/admin/orders/actions";
import { AdminOrderForm } from "@/components/admin-order-form";
import { AdminOrdersTable } from "@/components/admin-orders-table";
import { AdminSessionBar } from "@/components/admin-session-bar";
import { requireAdminUser } from "@/lib/auth";
import { getCurrencySettings } from "@/lib/currency";
import { createTranslator } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n/server";
import { listOrders } from "@/lib/order-store";

export default async function AdminOrdersPage() {
  const language = await getRequestLanguage();
  const currencySettings = await getCurrencySettings(language);
  const { t } = createTranslator(language);
  const adminUser = await requireAdminUser("/admin/orders");
  const orders = listOrders();

  return (
    <main className="page-stack">
      <section className="hero hero-copy">
        <p className="eyebrow">{t("admin.orders.hero.eyebrow")}</p>
        <h1 className="page-title">{t("admin.orders.hero.title")}</h1>
        <p className="lead">{t("admin.orders.hero.description")}</p>
      </section>

      <AdminSessionBar adminName={adminUser.label} role={adminUser.role} language={language} fixed={adminUser.fixed} />

      <section className="admin-grid">
        <AdminOrdersTable orders={orders} language={language} currencySettings={currencySettings} />
        <AdminOrderForm action={createOrderAction} />
      </section>
    </main>
  );
}
