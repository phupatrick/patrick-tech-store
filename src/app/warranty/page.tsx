import type { Metadata } from "next";

import { WarrantySearch } from "@/components/warranty-search";
import { createTranslator } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Tra cứu bảo hành",
  description: "Kiểm tra tình trạng bảo hành và thông tin đơn hàng nhanh theo mã đơn.",
  alternates: {
    canonical: "/warranty"
  },
  openGraph: {
    title: "Tra cứu bảo hành",
    description: "Kiểm tra tình trạng bảo hành và thông tin đơn hàng nhanh theo mã đơn.",
    url: "/warranty"
  }
};

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
