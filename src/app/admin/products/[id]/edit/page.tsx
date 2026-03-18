import { notFound } from "next/navigation";

import { updateProductAction } from "@/app/admin/products/actions";
import { AdminSessionBar } from "@/components/admin-session-bar";
import { ProductForm } from "@/components/product-form";
import { requireAdminUser } from "@/lib/auth";
import { getCurrencySettings } from "@/lib/currency";
import { getRequestCurrency } from "@/lib/currency/server";
import { createTranslator } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n/server";
import { productToFormValues } from "@/lib/product-form";
import { getLocalizedProductCopy } from "@/lib/product-localization";
import { getProductById } from "@/lib/product-store";

type EditProductPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: EditProductPageProps) {
  const language = await getRequestLanguage();
  const currency = await getRequestCurrency(language);
  const currencySettings = await getCurrencySettings(language, currency);
  const { t } = createTranslator(language);
  const adminUser = await requireAdminUser();
  const { id } = await params;
  const product = getProductById(id);

  if (!product) {
    notFound();
  }

  const localized = getLocalizedProductCopy(product, language);

  return (
    <main className="page-stack">
      <AdminSessionBar adminName={adminUser.label} role={adminUser.role} language={language} fixed={adminUser.fixed} />
      <ProductForm
        action={updateProductAction.bind(null, product.id)}
        initialValues={productToFormValues(product, currencySettings, language)}
        submitLabel={t("admin.form.edit.submit")}
        heading={t("admin.form.edit.heading", { name: localized.name })}
        description={t("admin.form.edit.description")}
      />
    </main>
  );
}
