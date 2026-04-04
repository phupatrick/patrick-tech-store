import type { Metadata } from "next";
import Link from "next/link";
import type { ComponentProps } from "react";

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

type HomeProps = {
  searchParams: Promise<{ q?: string; category?: string; sort?: string; page?: string }>;
};

type ContactChannel = ComponentProps<typeof ContactChannelIcon>["channel"];

type StorefrontContactAction = {
  href: string;
  label: string;
  channel: ContactChannel;
  external?: boolean;
  pillClassName: string;
  buttonClassName: string;
};

const getHomeMetadataContent = (isVietnamese: boolean) => ({
  title: isVietnamese
    ? "Cửa hàng tài khoản số, nâng cấp gói và AI tools"
    : "Digital accounts, package upgrades, and AI tools",
  description: isVietnamese
    ? "Mua tài khoản số, nâng cấp gói, Grok, YouTube Premium và nhiều dịch vụ số với giá rõ ràng, giao nhanh và hỗ trợ trực tiếp."
    : "Buy digital accounts, package upgrades, Grok, YouTube Premium, and more digital services with clear pricing, fast delivery, and direct support."
});

export async function generateMetadata(): Promise<Metadata> {
  const language = await getRequestLanguage();
  const { title, description } = getHomeMetadataContent(language === "vi");

  return {
    title,
    description,
    alternates: {
      canonical: "/"
    },
    openGraph: {
      title,
      description,
      url: "/"
    },
    twitter: {
      title,
      description
    }
  };
}

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

const createStorefrontContactContent = ({
  isVietnamese,
  t
}: {
  isVietnamese: boolean;
  t: ReturnType<typeof createTranslator>["t"];
}) => {
  const primaryAction: StorefrontContactAction = isVietnamese
    ? {
        href: ZALO_DIRECT_URL,
        label: t("home.contact.zalo"),
        channel: "zalo",
        external: true,
        pillClassName: "contact-pill-zalo",
        buttonClassName: "button-channel-zalo"
      }
    : {
        href: TELEGRAM_DIRECT_URL,
        label: t("home.contact.telegram"),
        channel: "telegram",
        external: true,
        pillClassName: "contact-pill-telegram",
        buttonClassName: "button-channel-telegram"
      };

  const secondaryAction: StorefrontContactAction = isVietnamese
    ? {
        href: DIRECT_PHONE_TEL_URL,
        label: t("home.contact.call"),
        channel: "phone",
        pillClassName: "contact-pill-phone",
        buttonClassName: "button-channel-phone"
      }
    : {
        href: WHATSAPP_DIRECT_URL,
        label: t("home.contact.whatsapp"),
        channel: "whatsapp",
        external: true,
        pillClassName: "contact-pill-whatsapp",
        buttonClassName: "button-channel-whatsapp"
      };

  return {
    primaryAction,
    secondaryAction
  };
};

function StorefrontContactActionLink({
  action,
  variant
}: {
  action: StorefrontContactAction;
  variant: "pill" | "button";
}) {
  const className =
    variant === "pill" ? `contact-pill ${action.pillClassName}` : `button button-channel ${action.buttonClassName}`;
  const content = (
    <>
      <ContactChannelIcon channel={action.channel} />
      {action.label}
    </>
  );

  if (action.external) {
    return (
      <a href={action.href} target="_blank" rel="noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return (
    <a href={action.href} className={className}>
      {content}
    </a>
  );
}

function CatalogPagination({
  currentPage,
  totalPages,
  query,
  category,
  sort,
  t
}: {
  currentPage: number;
  totalPages: number;
  query: string;
  category: string;
  sort: string;
  t: ReturnType<typeof createTranslator>["t"];
}) {
  const paginationPages = getPaginationPages(currentPage, totalPages);

  return (
    <nav className="catalog-pagination" aria-label={t("home.catalog.paginationAria")}>
      <Link
        href={buildCatalogHref({ query, category, sort, page: Math.max(1, currentPage - 1) })}
        className={`pagination-link${currentPage === 1 ? " disabled" : ""}`}
        aria-disabled={currentPage === 1}
        tabIndex={currentPage === 1 ? -1 : undefined}
      >
        {t("home.catalog.previousPage")}
      </Link>

      <div className="pagination-number-row">
        {paginationPages.map((paginationPage) => (
          <Link
            key={paginationPage}
            href={buildCatalogHref({ query, category, sort, page: paginationPage })}
            className={`pagination-link${paginationPage === currentPage ? " active" : ""}`}
            aria-current={paginationPage === currentPage ? "page" : undefined}
          >
            {paginationPage}
          </Link>
        ))}
      </div>

      <Link
        href={buildCatalogHref({ query, category, sort, page: Math.min(totalPages, currentPage + 1) })}
        className={`pagination-link${currentPage === totalPages ? " disabled" : ""}`}
        aria-disabled={currentPage === totalPages}
        tabIndex={currentPage === totalPages ? -1 : undefined}
      >
        {t("home.catalog.nextPage")}
      </Link>
    </nav>
  );
}

function ProductShowcaseSection({
  title,
  description,
  className,
  products,
  session,
  vouchers,
  priorityCount
}: {
  title: string;
  description: string;
  className: string;
  products: ComponentProps<typeof ProductGrid>["products"];
  session: ComponentProps<typeof ProductGrid>["session"];
  vouchers: ComponentProps<typeof ProductGrid>["vouchers"];
  priorityCount?: number;
}) {
  return (
    <section className={`page-stack section-block section-surface home-product-section ${className}`}>
      <div className="section-head">
        <h2 className="section-title">{title}</h2>
        <p className="muted section-subtitle">{description}</p>
      </div>

      <ProductGrid
        products={products}
        variant="public"
        session={session}
        vouchers={vouchers}
        priorityCount={priorityCount}
      />
    </section>
  );
}

export default async function Home({ searchParams }: HomeProps) {
  const siteUrl = getSiteUrl();
  const language = await getRequestLanguage();
  const currency = await getRequestCurrency(language);
  const { t } = createTranslator(language);
  const isVietnamese = language === "vi";
  const { description: homeDescription } = getHomeMetadataContent(isVietnamese);
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
  const featuredShowcaseProducts = featuredProducts.slice(0, 4);
  const flashSaleShowcaseProducts = flashSaleProducts.slice(0, 4);
  const { primaryAction, secondaryAction } = createStorefrontContactContent({ isVietnamese, t });
  const catalogHelpDescription = isVietnamese
    ? "Nhắn trực tiếp qua Zalo hoặc gọi 0933684560 để được báo giá nhanh, kiểm tra còn hàng hoặc yêu cầu bổ sung sản phẩm."
    : "Message us directly on Telegram or WhatsApp for fast pricing, stock checks, and product requests.";
  const quickContactTitle = t("home.contact.title");
  const quickContactDescription = isVietnamese
    ? "Chọn đúng kênh liên hệ để được hỗ trợ nhanh hơn."
    : "Choose the contact channel you prefer for a faster response.";
  const editorialTitle = isVietnamese
    ? "AI, công nghệ và những chủ đề đang kéo traffic"
    : "AI, technology, and the topics currently driving traffic";
  const editorialDescription = isVietnamese
    ? "Mặt tiền ưu tiên AI, công nghệ, ứng dụng số và nền tảng mới; các chủ đề hot vẫn được dùng để kéo thêm lượt xem nhưng không làm lệch chất tech của hệ thống."
    : "The storefront prioritizes AI, technology, digital tools, and emerging platforms; trending topics still help bring traffic in without diluting the tech-first positioning.";
  const editorialAriaLabel = isVietnamese ? "Định hướng nội dung ưu tiên" : "Priority content direction";
  const editorialPills = isVietnamese
    ? ["AI", "Công nghệ", "Ứng dụng", "Thiết bị", "Mạng xã hội", "Game", "Trend"]
    : ["AI", "Technology", "Apps", "Devices", "Social", "Gaming", "Trends"];
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
    description: homeDescription,
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
              <h2 className="section-title">{editorialTitle}</h2>
              <p className="muted section-subtitle editorial-spotlight-subtitle">{editorialDescription}</p>
            </div>
          </div>

          <div className="editorial-pill-row" aria-label={editorialAriaLabel}>
            {editorialPills.map((pill, index) => (
              <span
                key={pill}
                className={`editorial-pill${index < 2 ? " editorial-pill-primary" : ""}${index >= 5 ? " editorial-pill-soft" : ""}`}
              >
                {pill}
              </span>
            ))}
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
          <CatalogPagination currentPage={safeCurrentPage} totalPages={totalPages} query={q} category={category} sort={sort} t={t} />
        ) : null}

        <div className="catalog-help-card">
          <div className="catalog-help-copy">
            <p className="eyebrow">{t("home.catalog.missingEyebrow")}</p>
            <h3 className="card-title">{t("home.catalog.missingTitle")}</h3>
            <p className="muted">{catalogHelpDescription}</p>
          </div>

          <div className="catalog-help-actions">
            <StorefrontContactActionLink
              action={{ ...primaryAction, label: isVietnamese ? t("home.catalog.contactZalo") : t("home.catalog.contactTelegram") }}
              variant="pill"
            />
            <StorefrontContactActionLink
              action={{ ...secondaryAction, label: isVietnamese ? t("home.catalog.contactCall") : t("home.catalog.contactWhatsApp") }}
              variant="pill"
            />
          </div>
        </div>
      </section>

      <section className="hero hero-copy hero-premium hero-storefront home-hero">
        <div className="hero-copy-block home-hero-copy">
          <p className="eyebrow">{t("home.hero.eyebrow")}</p>
          <h1 className="page-title">{t("home.hero.title")}</h1>
          <p className="lead hero-lead">{t("home.hero.description")}</p>

          <div className="hero-actions home-hero-actions">
            <StorefrontContactActionLink action={primaryAction} variant="button" />
            <StorefrontContactActionLink action={secondaryAction} variant="button" />
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

      <ProductShowcaseSection
        title={t("home.featured.title")}
        description={t("home.featured.description")}
        className="home-product-section-featured"
        products={featuredShowcaseProducts}
        session={session}
        vouchers={voucherWallet?.activeDiscountVouchers}
        priorityCount={2}
      />

      {flashSaleProducts.length > 0 ? (
        <ProductShowcaseSection
          title={t("home.offers.title")}
          description={t("home.offers.description")}
          className="home-product-section-offers"
          products={flashSaleShowcaseProducts}
          session={session}
          vouchers={voucherWallet?.activeDiscountVouchers}
        />
      ) : null}

      <section className="footer-contact home-footer-contact">
        <div className="section-head footer-copy">
          <h2 className="section-title">{quickContactTitle}</h2>
          <p className="muted section-subtitle">{quickContactDescription}</p>
        </div>
        <div className="footer-actions">
          <StorefrontContactActionLink action={primaryAction} variant="pill" />
          <StorefrontContactActionLink action={secondaryAction} variant="pill" />
        </div>
      </section>

      <CommunityBubbles language={language} />
    </main>
  );
}
