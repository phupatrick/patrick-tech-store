import { CurrencyProvider } from "@/components/currency-provider";
import type { Metadata } from "next";

import { loginFromHeaderAction } from "@/app/admin/login/actions";
import { CurrencySwitcher } from "@/components/currency-switcher";
import { I18nProvider } from "@/components/i18n-provider";
import { HeaderAccessCodeForm } from "@/components/header-access-code-form";
import { LanguageWelcomeModal } from "@/components/language-welcome-modal";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SiteHeader } from "@/components/site-header";
import { getAuthSession } from "@/lib/auth";
import { getCurrencySettings } from "@/lib/currency";
import { getRequestCurrency } from "@/lib/currency/server";
import { createTranslator } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n/server";
import {
  getSiteUrl,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TITLE_TEMPLATE
} from "@/lib/site";

import "./globals.css";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: SITE_NAME,
    template: SITE_TITLE_TEMPLATE
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SITE_KEYWORDS,
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: "vi_VN"
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION
  },
  category: "technology",
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? {
        google: process.env.GOOGLE_SITE_VERIFICATION
      }
    : undefined
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const language = await getRequestLanguage();
  const currency = await getRequestCurrency(language);
  const currencySettings = await getCurrencySettings(language, currency);
  const { t } = createTranslator(language);
  const session = await getAuthSession();
  const showAdminLink = Boolean(session && ["admin", "deputy_admin", "staff"].includes(session.role));

  return (
    <html lang={language}>
      <body>
        <CurrencyProvider initialSettings={currencySettings}>
          <I18nProvider initialLanguage={language}>
            <div className="app-shell">
              <LanguageWelcomeModal />
              <SiteHeader
                brandKicker={t("layout.brand.kicker")}
                brandTitle={t("layout.brand.title")}
                storeLabel={t("layout.nav.store")}
                warrantyLabel={t("layout.nav.warranty")}
                companyInfoLabel={language === "vi" ? "Thông tin công ty" : "Company info"}
                companyInfoHref="/company"
                resellerLabel={t("layout.nav.reseller")}
                adminLabel={t("layout.nav.admin")}
                showAdminLink={showAdminLink}
              >
                <HeaderAccessCodeForm action={loginFromHeaderAction} session={session} />
                <CurrencySwitcher />
                <LanguageSwitcher />
              </SiteHeader>

              {children}
            </div>
          </I18nProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
