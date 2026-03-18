import Link from "next/link";

import { Language, translate } from "@/lib/i18n";
import { AccessRole } from "@/lib/types";

type AdminSessionBarProps = {
  adminName: string;
  role: AccessRole;
  language: Language;
  fixed?: boolean;
};

export function AdminSessionBar({ adminName, role, language, fixed }: AdminSessionBarProps) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const resolvedName = adminName.trim() || t("admin.fixedAccountLabel");

  return (
    <section className="surface admin-session-bar">
      <div className="admin-session-copy">
        <p className="eyebrow">{t("admin.session.title")}</p>
        <p className="card-title">{resolvedName}</p>
      </div>
      <div className="admin-session-nav">
        <Link href="/admin/products" className="button">
          {t("admin.session.products")}
        </Link>
        <Link href="/admin/inventory" className="button">
          {t("admin.session.inventory")}
        </Link>
        <Link href="/admin/orders" className="button">
          {t("admin.session.orders")}
        </Link>
        <Link href="/admin/products/new" className="button">
          {t("admin.session.newProduct")}
        </Link>
        {role === "admin" || role === "deputy_admin" ? (
          <Link href="/admin/access-codes" className="button">
            {t("admin.accessCodes.nav")}
          </Link>
        ) : null}
        <form action="/admin/logout" method="post">
          <input type="hidden" name="next" value="/admin/login" />
          <button type="submit" className="button">
            {t("admin.session.signOut")}
          </button>
        </form>
      </div>
    </section>
  );
}
