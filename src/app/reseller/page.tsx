import { cookies } from "next/headers";

import { ProductGrid } from "@/components/product-grid";
import { createTranslator } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n/server";
import { getVisibleProducts, getUserById } from "@/lib/pricing";
import { users } from "@/lib/data";

export default async function ResellerPage() {
  const language = await getRequestLanguage();
  const { t } = createTranslator(language);
  const cookieStore = await cookies();
  const resellerUserId = cookieStore.get("reseller_user")?.value;
  const reseller = resellerUserId ? getUserById(resellerUserId) : undefined;
  const signedInReseller = reseller?.role === "reseller" ? reseller : undefined;
  const resellerAccounts = users.filter((user) => user.role === "reseller");
  const products = signedInReseller
    ? getVisibleProducts(signedInReseller.id, signedInReseller.tier, language)
    : [];

  return (
    <main className="page-stack">
      <section className="hero hero-copy">
        <p className="eyebrow">{t("reseller.hero.eyebrow")}</p>
        <h2 className="page-title">{t("reseller.hero.title")}</h2>
        <p className="lead">{t("reseller.hero.description")}</p>
      </section>

      {signedInReseller ? (
        <>
          <section className="surface">
            <div className="section-head">
              <div>
                <h2 className="section-title">{t("reseller.account.title")}</h2>
                <p className="muted">{t("reseller.account.description")}</p>
              </div>
              <form action="/reseller/logout" method="post">
                <button type="submit" className="button">
                  {t("reseller.account.signOut")}
                </button>
              </form>
            </div>
            <div className="detail-grid">
              <div className="detail-card">
                <p className="eyebrow">{t("admin.userControls.user")}</p>
                <p className="card-title">{signedInReseller.name}</p>
                <p className="muted">{signedInReseller.phone}</p>
              </div>
              <div className="detail-card">
                <p className="eyebrow">{t("reseller.account.tier")}</p>
                <p className="card-title">{t(`tier.${signedInReseller.tier}` as const)}</p>
              </div>
            </div>
          </section>

          <section className="page-stack">
            <div className="section-head">
              <div>
                <p className="eyebrow">{t("home.catalog.eyebrow")}</p>
                <h2 className="section-title">{t("home.catalog.title")}</h2>
              </div>
            </div>
            <ProductGrid products={products} variant="internal" />
          </section>
        </>
      ) : (
        <section className="surface page-stack">
          <div>
            <h2 className="section-title">{t("reseller.auth.title")}</h2>
            <p className="muted">{t("reseller.auth.description")}</p>
          </div>
          <div className="feature-grid">
            {resellerAccounts.map((user) => (
              <form key={user.id} action="/reseller/login" method="post" className="feature-card">
                <input type="hidden" name="userId" value={user.id} />
                <p className="eyebrow">{t(`tier.${user.tier}` as const)}</p>
                <p className="card-title">{user.name}</p>
                <p className="muted">{user.phone}</p>
                <button type="submit" className="button">
                  {t("reseller.auth.action")}
                </button>
              </form>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
