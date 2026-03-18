import { CurrencyProvider } from "@/components/currency-provider";
import type { Metadata } from "next";

import { loginFromHeaderAction } from "@/app/admin/login/actions";
import { I18nProvider } from "@/components/i18n-provider";
import { HeaderAccessCodeForm } from "@/components/header-access-code-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SiteHeader } from "@/components/site-header";
import { getAuthSession } from "@/lib/auth";
import { getCurrencySettings } from "@/lib/currency";
import { createTranslator } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n/server";

import "./globals.css";

export const metadata: Metadata = {
  title: "Patrick Tech Store",
  description: "Premium digital storefront with fast delivery, warranty coverage, and responsive support."
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const language = await getRequestLanguage();
  const currencySettings = await getCurrencySettings(language);
  const { t } = createTranslator(language);
  const session = await getAuthSession();
  const showAdminLink = Boolean(session && ["admin", "deputy_admin", "staff"].includes(session.role));

  return (
    <html lang={language}>
      <body>
        <CurrencyProvider initialSettings={currencySettings}>
          <I18nProvider initialLanguage={language}>
            <div className="app-shell">
              <SiteHeader
                brandKicker={t("layout.brand.kicker")}
                brandTitle={t("layout.brand.title")}
                storeLabel={t("layout.nav.store")}
                warrantyLabel={t("layout.nav.warranty")}
                resellerLabel={t("layout.nav.reseller")}
                adminLabel={t("layout.nav.admin")}
                showAdminLink={showAdminLink}
              >
                <HeaderAccessCodeForm action={loginFromHeaderAction} session={session} />
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
