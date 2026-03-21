import Link from "next/link";

import { CatalogControls } from "@/components/catalog-controls";
import { CommunityBubbles } from "@/components/community-bubbles";
import { ContactChannelIcon } from "@/components/contact-channel-icon";
import { ProductGrid } from "@/components/product-grid";
import { getAuthSession } from "@/lib/auth";
import { getRequestCurrency } from "@/lib/currency/server";
import { createTranslator } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n/server";
import { getStorefrontSnapshot } from "@/lib/pricing";
import { getVoucherWalletForSession } from "@/lib/voucher-wallet";

const ZALO_GROUP_URL = "https://zalo.me/g/kmpeiw236";
const TELEGRAM_GROUP_URL = "https://t.me/PatrichTechMenu";
const CATALOG_PAGE_SIZE = 6;
const PAGINATION_WINDOW = 5;

type HomeProps = {
  searchParams: Promise<{ q?: string; category?: string; sort?: string; page?: string }>;
};

const buildCatalogHref = ({
  query,
  category,
  sort,
  page
}: {
  query?: string;
  category?: string;
  sort?: string;
  page?: number;
}) => {
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
  }

  if (category) {
    params.set("category", category);
  }

  if (sort && sort !== "relevant") {
    params.set("sort", sort);
  }

  if (page && page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();
  return queryString ? `/?${queryString}` : "/";
};

const getPaginationPages = (currentPage: number, totalPages: number) => {
  const halfWindow = Math.floor(PAGINATION_WINDOW / 2);
  const startPage = Math.max(1, Math.min(currentPage - halfWindow, totalPages - PAGINATION_WINDOW + 1));
  const endPage = Math.min(totalPages, Math.max(PAGINATION_WINDOW, currentPage + halfWindow));
  const pages: number[] = [];

  for (let page = startPage; page <= endPage; page += 1) {
    pages.push(page);
  }

  return pages;
};

export default async function Home({ searchParams }: HomeProps) {
  const language = await getRequestLanguage();
  const currency = await getRequestCurrency(language);
  const { t } = createTranslator(language);
  const session = await getAuthSession();
  const voucherWallet = getVoucherWalletForSession(session);
  const { q = "", category = "", sort = "relevant", page = "1" } = await searchParams;
  const { featuredProducts, flashSaleProducts, catalogProducts, categories } = await getStorefrontSnapshot({
    language,
    currency,
    query: q,
    category,
    sort,
    session
  });
  const requestedPage = Number.parseInt(page, 10);
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const totalCatalogProducts = catalogProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalCatalogProducts / CATALOG_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedCatalogProducts = catalogProducts.slice(
    (safeCurrentPage - 1) * CATALOG_PAGE_SIZE,
    safeCurrentPage * CATALOG_PAGE_SIZE
  );
  const paginationPages = getPaginationPages(safeCurrentPage, totalPages);
  const featuredShowcaseProducts = featuredProducts.slice(0, 4);
  const flashSaleShowcaseProducts = flashSaleProducts.slice(0, 4);
  const showZaloChannel = language === "vi";
  const contactActionClass = `hero-actions home-hero-actions${showZaloChannel ? "" : " home-hero-actions-single"}`;
  const catalogHelpClass = `catalog-help-actions${showZaloChannel ? "" : " catalog-help-actions-single"}`;
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
      <section className="page-stack section-block section-surface home-product-section home-product-section-catalog">
        <div className="catalog-heading">
          <div className="section-head">
            <h2 className="section-title">{t("home.catalog.title")}</h2>
            <p className="muted section-subtitle">{t("home.catalog.description")}</p>
          </div>
          <div className="catalog-meta">
            <p className="catalog-result-count">{t("home.catalog.resultCount", { count: totalCatalogProducts })}</p>
            {totalPages > 1 ? (
              <p className="catalog-page-status">{t("home.catalog.pageStatus", { page: safeCurrentPage, total: totalPages })}</p>
            ) : null}
          </div>
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

        {paginatedCatalogProducts.length > 0 ? (
          <ProductGrid
            products={paginatedCatalogProducts}
            variant="public"
            session={session}
            vouchers={voucherWallet?.activeDiscountVouchers}
          />
        ) : (
          <div className="notice">{t("home.catalog.empty")}</div>
        )}

        {totalPages > 1 ? (
          <nav className="catalog-pagination" aria-label={t("home.catalog.paginationAria")}>
            <Link
              href={buildCatalogHref({ query: q, category, sort, page: Math.max(1, safeCurrentPage - 1) })}
              className={`pagination-link${safeCurrentPage === 1 ? " disabled" : ""}`}
              aria-disabled={safeCurrentPage === 1}
              tabIndex={safeCurrentPage === 1 ? -1 : undefined}
            >
              {t("home.catalog.previousPage")}
            </Link>

            <div className="pagination-number-row">
              {paginationPages.map((paginationPage) => (
                <Link
                  key={paginationPage}
                  href={buildCatalogHref({ query: q, category, sort, page: paginationPage })}
                  className={`pagination-link${paginationPage === safeCurrentPage ? " active" : ""}`}
                  aria-current={paginationPage === safeCurrentPage ? "page" : undefined}
                >
                  {paginationPage}
                </Link>
              ))}
            </div>

            <Link
              href={buildCatalogHref({ query: q, category, sort, page: Math.min(totalPages, safeCurrentPage + 1) })}
              className={`pagination-link${safeCurrentPage === totalPages ? " disabled" : ""}`}
              aria-disabled={safeCurrentPage === totalPages}
              tabIndex={safeCurrentPage === totalPages ? -1 : undefined}
            >
              {t("home.catalog.nextPage")}
            </Link>
          </nav>
        ) : null}

        <div className="catalog-help-card">
          <div className="catalog-help-copy">
            <p className="eyebrow">{t("home.catalog.missingEyebrow")}</p>
            <h3 className="card-title">{t("home.catalog.missingTitle")}</h3>
            <p className="muted">{t("home.catalog.missingDescription")}</p>
          </div>

          <div className={catalogHelpClass}>
            {showZaloChannel ? (
              <a href={ZALO_GROUP_URL} target="_blank" rel="noreferrer" className="contact-pill contact-pill-zalo">
                <ContactChannelIcon channel="zalo" />
                {t("home.catalog.contactZalo")}
              </a>
            ) : null}
            <a href={TELEGRAM_GROUP_URL} target="_blank" rel="noreferrer" className="contact-pill contact-pill-telegram">
              <ContactChannelIcon channel="telegram" />
              {t("home.catalog.contactTelegram")}
            </a>
          </div>
        </div>
      </section>

      <section className="hero hero-copy hero-premium hero-storefront home-hero">
        <div className="hero-copy-block home-hero-copy">
          <p className="eyebrow">{t("home.hero.eyebrow")}</p>
          <h1 className="page-title">{t("home.hero.title")}</h1>
          <p className="lead hero-lead">{t("home.hero.description")}</p>

          <div className={contactActionClass}>
            {showZaloChannel ? (
              <a href={ZALO_GROUP_URL} target="_blank" rel="noreferrer" className="button button-channel button-channel-zalo">
                <ContactChannelIcon channel="zalo" />
                {t("home.contact.zalo")}
              </a>
            ) : null}
            <a
              href={TELEGRAM_GROUP_URL}
              target="_blank"
              rel="noreferrer"
              className="button button-channel button-channel-telegram"
            >
              <ContactChannelIcon channel="telegram" />
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

      <section className="page-stack section-block section-surface home-product-section home-product-section-featured">
        <div className="section-head">
          <h2 className="section-title">{t("home.featured.title")}</h2>
          <p className="muted section-subtitle">{t("home.featured.description")}</p>
        </div>

        <ProductGrid
          products={featuredShowcaseProducts}
          variant="public"
          session={session}
          vouchers={voucherWallet?.activeDiscountVouchers}
          priorityCount={2}
        />
      </section>

      {flashSaleProducts.length > 0 ? (
        <section className="page-stack section-block section-surface home-product-section home-product-section-offers">
          <div className="section-head">
            <h2 className="section-title">{t("home.offers.title")}</h2>
            <p className="muted section-subtitle">{t("home.offers.description")}</p>
          </div>

          <ProductGrid
            products={flashSaleShowcaseProducts}
            variant="public"
            session={session}
            vouchers={voucherWallet?.activeDiscountVouchers}
          />
        </section>
      ) : null}

      <section className="footer-contact home-footer-contact">
        <div className="section-head footer-copy">
          <h2 className="section-title">{t("home.community.title")}</h2>
          <p className="muted section-subtitle">{t("home.community.description")}</p>
        </div>
        <div className="footer-actions">
          {showZaloChannel ? (
            <a href={ZALO_GROUP_URL} target="_blank" rel="noreferrer" className="contact-pill contact-pill-zalo">
              <ContactChannelIcon channel="zalo" />
              {t("home.community.zalo")}
            </a>
          ) : null}
          <a href={TELEGRAM_GROUP_URL} target="_blank" rel="noreferrer" className="contact-pill contact-pill-telegram">
            <ContactChannelIcon channel="telegram" />
            {t("home.community.telegram")}
          </a>
        </div>
      </section>

      <CommunityBubbles language={language} />
    </main>
  );
}
