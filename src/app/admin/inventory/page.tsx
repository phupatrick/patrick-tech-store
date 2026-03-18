import { AdminInventoryTable } from "@/components/admin-inventory-table";
import { AdminSessionBar } from "@/components/admin-session-bar";
import { requireAdminUser } from "@/lib/auth";
import { getCurrencySettings } from "@/lib/currency";
import { createTranslator } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n/server";
import { listProducts } from "@/lib/product-store";

export default async function AdminInventoryPage() {
  const language = await getRequestLanguage();
  const currencySettings = await getCurrencySettings(language);
  const { t } = createTranslator(language);
  const adminUser = await requireAdminUser("/admin/inventory");
  const products = listProducts();

  return (
    <main className="page-stack">
      <section className="hero hero-copy">
        <p className="eyebrow">{t("admin.inventory.hero.eyebrow")}</p>
        <h2 className="page-title">{t("admin.inventory.hero.title")}</h2>
        <p className="lead">{t("admin.inventory.hero.description")}</p>
      </section>

      <AdminSessionBar adminName={adminUser.label} role={adminUser.role} language={language} fixed={adminUser.fixed} />
      <AdminInventoryTable products={products} language={language} currencySettings={currencySettings} />
    </main>
  );
}
