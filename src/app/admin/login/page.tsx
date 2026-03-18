import { redirect } from "next/navigation";

import { loginWithAccessCodeAction } from "@/app/admin/login/actions";
import { AccessCodeLoginForm } from "@/components/access-code-login-form";
import { getAuthSession } from "@/lib/auth";
import { createTranslator } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n/server";

type AdminLoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const language = await getRequestLanguage();
  const { t } = createTranslator(language);
  const { next } = await searchParams;
  const nextPath = next?.startsWith("/") ? next : "/admin/products";
  const signedInAdmin = await getAuthSession();

  if (signedInAdmin && ["admin", "deputy_admin", "staff"].includes(signedInAdmin.role)) {
    redirect(nextPath);
  }

  return (
    <main className="page-stack">
      <section className="hero hero-copy">
        <p className="eyebrow">{t("admin.login.hero.eyebrow")}</p>
        <h1 className="page-title">{t("admin.login.hero.title")}</h1>
        <p className="lead">{t("admin.login.hero.description")}</p>
      </section>

      <AccessCodeLoginForm action={loginWithAccessCodeAction} nextPath={nextPath} />
    </main>
  );
}
