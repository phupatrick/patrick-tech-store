import { WarrantySearch } from "@/components/warranty-search";
import { createTranslator } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n/server";

export default async function WarrantyPage() {
  const language = await getRequestLanguage();
  const { t } = createTranslator(language);

  return (
    <main className="page-stack">
      <section className="hero hero-copy">
        <p className="eyebrow">{t("warranty.hero.eyebrow")}</p>
        <h2 className="page-title">{t("warranty.hero.title")}</h2>
        <p className="lead">{t("warranty.hero.description")}</p>
      </section>

      <WarrantySearch />
    </main>
  );
}
