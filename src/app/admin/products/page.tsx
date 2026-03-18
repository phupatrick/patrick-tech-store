import { AdminProductsTable } from "@/components/admin-products-table";
import { AdminSessionBar } from "@/components/admin-session-bar";
import { requireAdminUser } from "@/lib/auth";
import { getCurrencySettings } from "@/lib/currency";
import { getRequestCurrency } from "@/lib/currency/server";
import { createTranslator } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n/server";
import { listProducts } from "@/lib/product-store";

type AdminProductsPageProps = {
  searchParams: Promise<{ focus?: string }>;
};

export default async function AdminProductsPage({ searchParams }: AdminProductsPageProps) {
  const language = await getRequestLanguage();
  const currency = await getRequestCurrency(language);
  const currencySettings = await getCurrencySettings(language, currency);
  const { t } = createTranslator(language);
  const adminUser = await requireAdminUser("/admin/products");
  const products = listProducts();
  const { focus } = await searchParams;

  return (
    <main className="page-stack">
      <section className="hero hero-copy">
        <p className="eyebrow">{t("admin.products.hero.eyebrow")}</p>
        <h2 className="page-title">{t("admin.products.hero.title")}</h2>
        <p className="lead">{t("admin.products.hero.description")}</p>
      </section>

      <AdminSessionBar adminName={adminUser.label} role={adminUser.role} language={language} fixed={adminUser.fixed} />
      <AdminProductsTable
        products={products}
        highlightProductId={focus}
        language={language}
        currencySettings={currencySettings}
      />
    </main>
  );
}
