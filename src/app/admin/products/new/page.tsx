import { AdminSessionBar } from "@/components/admin-session-bar";
import { ProductForm } from "@/components/product-form";
import { requireAdminUser } from "@/lib/auth";
import { createTranslator } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n/server";
import { getProductStoreReadOnlyNotice, isLiveProductStoreReadOnly } from "@/lib/product-persistence";

import { createProductAction } from "../actions";

export default async function NewProductPage() {
  const language = await getRequestLanguage();
  const { t } = createTranslator(language);
  const adminUser = await requireAdminUser("/admin/products/new");
  const storageLocked = isLiveProductStoreReadOnly();

  return (
    <main className="page-stack">
      <AdminSessionBar adminName={adminUser.label} role={adminUser.role} language={language} fixed={adminUser.fixed} />
      <ProductForm
        action={createProductAction}
        submitLabel={t("admin.form.new.submit")}
        heading={t("admin.form.new.heading")}
        description={t("admin.form.new.description")}
        storageLocked={storageLocked}
        storageNotice={storageLocked ? getProductStoreReadOnlyNotice(language) : undefined}
      />
    </main>
  );
}
