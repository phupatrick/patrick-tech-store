import Link from "next/link";

import { CatalogControls } from "@/components/catalog-controls";
import { CommunityBubbles } from "@/components/community-bubbles";
import { ProductGrid } from "@/components/product-grid";
import { getAuthSession } from "@/lib/auth";
import { createTranslator } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n/server";
import { getStorefrontSnapshot } from "@/lib/pricing";
import { getVoucherWalletForSession } from "@/lib/voucher-wallet";

const ZALO_GROUP_URL = "https://zalo.me/g/kmpeiw236";
const TELEGRAM_GROUP_URL = "https://t.me/PatrichTechMenu";

type HomeProps = {
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const language = await getRequestLanguage();
  const { t } = createTranslator(language);
  const session = await getAuthSession();
  const voucherWallet = getVoucherWalletForSession(session);
  const { q = "", category = "", sort = "relevant" } = await searchParams;
  const { featuredProducts, flashSaleProducts, catalogProducts, categories } = getStorefrontSnapshot({
    language,
    query: q,
    category,
    sort,
    session
  });
  const featureKeys = [
    {
      title: "home.feature.pricing.title",
      description: "home.feature.pricing.description"
    },
    {
      title: "home.feature.checkout.title",
      description: "home.feature.checkout.description"
    },
    {
      title: "home.feature.support.title",
      description: "home.feature.support.description"
    }
  ] as const;

  return (
    <main className="page-stack">
      <section className="hero hero-copy hero-premium hero-storefront home-hero">
        <div className="hero-copy-block home-hero-copy">
          <p className="eyebrow">{t("home.hero.eyebrow")}</p>
          <h1 className="page-title">{t("home.hero.title")}</h1>
          <p className="lead hero-lead">{t("home.hero.description")}</p>
          <div className="hero-actions home-hero-actions">
            <a href={ZALO_GROUP_URL} target="_blank" rel="noreferrer" className="button button-primary">
              {t("home.contact.zalo")}
            </a>
            <a href={TELEGRAM_GROUP_URL} target="_blank" rel="noreferrer" className="button">
              {t("home.contact.telegram")}
            </a>
            <Link href="/warranty" className="button">
              {t("layout.nav.warranty")}
            </Link>
          </div>
          <p className="hero-note">{t("home.contact.note")}</p>
        </div>

        <div className="feature-grid home-feature-grid">
          {featureKeys.map((feature) => (
            <div key={feature.title} className="feature-card feature-card-premium home-feature-card">
              <p className="card-title">{t(feature.title)}</p>
              <p className="muted feature-description">{t(feature.description)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="page-stack section-block section-surface home-product-section">
        <div className="catalog-heading">
          <div className="section-head">
            <h2 className="section-title">{t("home.catalog.title")}</h2>
            <p className="muted section-subtitle">{t("home.catalog.description")}</p>
          </div>
          <p className="catalog-result-count">{t("home.catalog.resultCount", { count: catalogProducts.length })}</p>
        </div>

        <div className="catalog-panel">
          <CatalogControls
            language={language}
            categories={categories}
            initialQuery={q}
            initialCategory={category}
            initialSort={sort}
          />
        </div>

        {catalogProducts.length > 0 ? (
          <ProductGrid products={catalogProducts} variant="public" session={session} vouchers={voucherWallet?.activeDiscountVouchers} />
        ) : (
          <div className="notice">{t("home.catalog.empty")}</div>
        )}

        <div className="catalog-help-card">
          <div className="catalog-help-copy">
            <p className="eyebrow">{t("home.catalog.missingEyebrow")}</p>
            <h3 className="card-title">{t("home.catalog.missingTitle")}</h3>
            <p className="muted">{t("home.catalog.missingDescription")}</p>
          </div>
          <div className="catalog-help-actions">
            <a href={ZALO_GROUP_URL} target="_blank" rel="noreferrer" className="contact-pill">
              <span className="contact-icon" aria-hidden="true">
                Z
              </span>
              {t("home.catalog.contactZalo")}
            </a>
            <a href={TELEGRAM_GROUP_URL} target="_blank" rel="noreferrer" className="contact-pill">
              <span className="contact-icon" aria-hidden="true">
                T
              </span>
              {t("home.catalog.contactTelegram")}
            </a>
          </div>
        </div>
      </section>

      <section className="page-stack section-block section-surface home-product-section">
        <div className="section-head">
          <h2 className="section-title">{t("home.featured.title")}</h2>
          <p className="muted section-subtitle">{t("home.featured.description")}</p>
        </div>

        <ProductGrid
          products={featuredProducts}
          variant="public"
          session={session}
          vouchers={voucherWallet?.activeDiscountVouchers}
          priorityCount={2}
        />
      </section>

      {flashSaleProducts.length > 0 ? (
        <section className="page-stack section-block section-surface home-product-section">
          <div className="section-head">
            <h2 className="section-title">{t("home.offers.title")}</h2>
            <p className="muted section-subtitle">{t("home.offers.description")}</p>
          </div>

          <ProductGrid products={flashSaleProducts} variant="public" session={session} vouchers={voucherWallet?.activeDiscountVouchers} />
        </section>
      ) : null}

      <section className="footer-contact home-footer-contact">
        <div className="section-head footer-copy">
          <h2 className="section-title">{t("home.community.title")}</h2>
          <p className="muted section-subtitle">{t("home.community.description")}</p>
        </div>
        <div className="footer-actions">
          <a href={ZALO_GROUP_URL} target="_blank" rel="noreferrer" className="contact-pill">
            <span className="contact-icon" aria-hidden="true">
              Z
            </span>
            {t("home.community.zalo")}
          </a>
          <a href={TELEGRAM_GROUP_URL} target="_blank" rel="noreferrer" className="contact-pill">
            <span className="contact-icon" aria-hidden="true">
              T
            </span>
            {t("home.community.telegram")}
          </a>
        </div>
      </section>

      <CommunityBubbles language={language} />
    </main>
  );
}
