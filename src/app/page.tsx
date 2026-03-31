import type { Metadata } from "next";
import Link from "next/link";

import { CatalogControls } from "@/components/catalog-controls";
import { CommunityBubbles } from "@/components/community-bubbles";
import { ContactChannelIcon } from "@/components/contact-channel-icon";
import { ProductGrid } from "@/components/product-grid";
import { getAuthSession } from "@/lib/auth";
import {
  DIRECT_PHONE_TEL_URL,
  TELEGRAM_DIRECT_URL,
  WHATSAPP_DIRECT_URL,
  ZALO_DIRECT_URL
} from "@/lib/contact-links";
import { getRequestCurrency } from "@/lib/currency/server";
import { createTranslator } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n/server";
import { getStorefrontSnapshot } from "@/lib/pricing";
import { getSiteUrl, OFFICIAL_COMPANY_INFO_URL, SITE_NAME } from "@/lib/site";
import { getVoucherWalletForSession } from "@/lib/voucher-wallet";
const CATALOG_PAGE_SIZE = 6;
const PAGINATION_WINDOW = 5;
const HOME_TITLE = "Cửa hàng tài khoản số, nâng cấp gói và AI tools";
const HOME_DESCRIPTION =
  "Mua tài khoản số, nâng cấp gói, Grok, YouTube Premium và nhiều dịch vụ số với giá rõ ràng, giao nhanh và hỗ trợ trực tiếp.";

type HomeProps = {
  searchParams: Promise<{ q?: string; category?: string; sort?: string; page?: string }>;
};

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: "/"
  },
  twitter: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION
  }
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
  const siteUrl = getSiteUrl();
  const language = await getRequestLanguage();
  const currency = await getRequestCurrency(language);
  const { t } = createTranslator(language);
  const session = await getAuthSession();
  const voucherWallet = getVoucherWalletForSession(session);
  const { q = "", category = "", sort: requestedSort, page = "1" } = await searchParams;
  const sort = requestedSort || (q || category ? "relevant" : "price-asc");
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
  const isVietnamese = language === "vi";
  const catalogHelpDescription = isVietnamese
    ? "Nhắn trực tiếp qua Zalo hoặc gọi số 0933684560 để được báo giá nhanh, kiểm tra còn hàng hoặc yêu cầu bổ sung sản phẩm."
    : "Message us directly on Telegram or WhatsApp for fast pricing, stock checks, and product requests.";
  const quickContactTitle = isVietnamese ? "Liên hệ nhanh" : "Quick contact";
  const quickContactDescription = isVietnamese
    ? "Chọn đúng kênh liên hệ để được hỗ trợ nhanh hơn."
    : "Choose the contact channel you prefer for a faster response.";
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
  const storeJsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: SITE_NAME,
    description: HOME_DESCRIPTION,
    url: siteUrl,
    telephone: "0933684560",
    availableLanguage: ["vi", "en"],
    sameAs: [OFFICIAL_COMPANY_INFO_URL]
  };
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <main className="page-stack">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />

      <section className="page-stack section-block section-surface home-product-section home-product-section-catalog">
        <div className="editorial-spotlight">
          <div className="section-head editorial-spotlight-head">
            <div>
              <p className="eyebrow">Patrick Tech Media</p>
              <h2 className="section-title">AI, công nghệ và những chủ đề đang kéo traffic</h2>
              <p className="muted section-subtitle editorial-spotlight-subtitle">
                Mặt tiền ưu tiên AI, công nghệ, ứng dụng số và nền tảng mới; các chủ đề hot vẫn được dùng để kéo thêm lượt xem
                nhưng không làm lệch chất tech của hệ thống.
              </p>
            </div>
          </div>

          <div className="editorial-pill-row" aria-label="Định hướng nội dung ưu tiên">
            <span className="editorial-pill editorial-pill-primary">AI</span>
            <span className="editorial-pill editorial-pill-primary">Công nghệ</span>
            <span className="editorial-pill">Ứng dụng</span>
            <span className="editorial-pill">Thiết bị</span>
            <span className="editorial-pill">Mạng xã hội</span>
            <span className="editorial-pill editorial-pill-soft">Game</span>
            <span className="editorial-pill editorial-pill-soft">Trend</span>
          </div>
        </div>

        <div className="catalog-heading">
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
            <p className="muted">{catalogHelpDescription}</p>
          </div>

          <div className="catalog-help-actions">
            {isVietnamese ? (
              <a href={ZALO_DIRECT_URL} target="_blank" rel="noreferrer" className="contact-pill contact-pill-zalo">
                <ContactChannelIcon channel="zalo" />
                {t("home.catalog.contactZalo")}
              </a>
            ) : (
              <a
                href={TELEGRAM_DIRECT_URL}
                target="_blank"
                rel="noreferrer"
                className="contact-pill contact-pill-telegram"
              >
                <ContactChannelIcon channel="telegram" />
                {t("home.catalog.contactTelegram")}
              </a>
            )}
            {isVietnamese ? (
              <a href={DIRECT_PHONE_TEL_URL} className="contact-pill contact-pill-phone">
                <ContactChannelIcon channel="phone" />
                {t("home.catalog.contactCall")}
              </a>
            ) : (
              <a
                href={WHATSAPP_DIRECT_URL}
                target="_blank"
                rel="noreferrer"
                className="contact-pill contact-pill-whatsapp"
              >
                <ContactChannelIcon channel="whatsapp" />
                {t("home.catalog.contactWhatsApp")}
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="hero hero-copy hero-premium hero-storefront home-hero">
        <div className="hero-copy-block home-hero-copy">
          <p className="eyebrow">{t("home.hero.eyebrow")}</p>
          <h1 className="page-title">{t("home.hero.title")}</h1>
          <p className="lead hero-lead">{t("home.hero.description")}</p>

          <div className="hero-actions home-hero-actions">
            {isVietnamese ? (
              <a href={ZALO_DIRECT_URL} target="_blank" rel="noreferrer" className="button button-channel button-channel-zalo">
                <ContactChannelIcon channel="zalo" />
                {t("home.contact.zalo")}
              </a>
            ) : (
              <a
                href={TELEGRAM_DIRECT_URL}
                target="_blank"
                rel="noreferrer"
                className="button button-channel button-channel-telegram"
              >
                <ContactChannelIcon channel="telegram" />
                {t("home.contact.telegram")}
              </a>
            )}
            {isVietnamese ? (
              <a href={DIRECT_PHONE_TEL_URL} className="button button-channel button-channel-phone">
                <ContactChannelIcon channel="phone" />
                {t("home.contact.call")}
              </a>
            ) : (
              <a
                href={WHATSAPP_DIRECT_URL}
                target="_blank"
                rel="noreferrer"
                className="button button-channel button-channel-whatsapp"
              >
                <ContactChannelIcon channel="whatsapp" />
                {t("home.contact.whatsapp")}
              </a>
            )}
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
          <h2 className="section-title">{quickContactTitle}</h2>
          <p className="muted section-subtitle">{quickContactDescription}</p>
        </div>
        <div className="footer-actions">
          {isVietnamese ? (
            <a href={ZALO_DIRECT_URL} target="_blank" rel="noreferrer" className="contact-pill contact-pill-zalo">
              <ContactChannelIcon channel="zalo" />
              {t("home.contact.zalo")}
            </a>
          ) : (
            <a href={TELEGRAM_DIRECT_URL} target="_blank" rel="noreferrer" className="contact-pill contact-pill-telegram">
              <ContactChannelIcon channel="telegram" />
              {t("home.contact.telegram")}
            </a>
          )}
          {isVietnamese ? (
            <a href={DIRECT_PHONE_TEL_URL} className="contact-pill contact-pill-phone">
              <ContactChannelIcon channel="phone" />
              {t("home.contact.call")}
            </a>
          ) : (
            <a href={WHATSAPP_DIRECT_URL} target="_blank" rel="noreferrer" className="contact-pill contact-pill-whatsapp">
              <ContactChannelIcon channel="whatsapp" />
              {t("home.contact.whatsapp")}
            </a>
          )}
        </div>
      </section>

      <CommunityBubbles language={language} />
    </main>
  );
}
