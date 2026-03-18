import Link from "next/link";

import {
  createAccessCodeAction,
  deleteAccessCodeAction,
  toggleAccessCodeAction,
  updateAccessCodeAction
} from "@/app/admin/access-codes/actions";
import { AccessCodeForm } from "@/components/access-code-form";
import { AccessCodeDeleteButton } from "@/components/access-code-delete-button";
import { AdminSessionBar } from "@/components/admin-session-bar";
import { listAccessCodes } from "@/lib/access-codes";
import { emptyAccessCodeFormValues } from "@/lib/access-code-form";
import { requireAdminRole } from "@/lib/auth";
import { createTranslator } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n/server";
import { getMemberRoleKey, getMemberTierKey, isVipMember } from "@/lib/member-status";

type AccessCodesPageProps = {
  searchParams: Promise<{ edit?: string }>;
};

const formatDate = (value: string, language: "vi" | "en") =>
  new Intl.DateTimeFormat(language === "en" ? "en-US" : "vi-VN", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));

export default async function AccessCodesPage({ searchParams }: AccessCodesPageProps) {
  const language = await getRequestLanguage();
  const { t } = createTranslator(language);
  const adminSession = await requireAdminRole("/admin/access-codes");
  const { edit } = await searchParams;
  const accessCodes = listAccessCodes();
  const editingRecord = edit ? accessCodes.find((item) => item.id === edit) : undefined;
  const initialValues = editingRecord
    ? {
        code: "",
        label: editingRecord.label,
        role: editingRecord.role,
        tier: editingRecord.tier,
        points: String(editingRecord.points),
        active: editingRecord.active
      }
    : emptyAccessCodeFormValues;

  return (
    <main className="page-stack">
      <section className="hero hero-copy">
        <p className="eyebrow">{t("admin.accessCodes.nav")}</p>
        <h1 className="page-title">{t("admin.accessCodes.title")}</h1>
        <p className="lead">{t("admin.accessCodes.description")}</p>
      </section>

      <AdminSessionBar adminName={adminSession.label} role={adminSession.role} language={language} fixed={adminSession.fixed} />

      <section className="admin-grid">
        <section className="surface page-stack">
          <div className="section-head">
            <div>
              <h2 className="section-title">{t("admin.accessCodes.table.title")}</h2>
              <p className="muted">{t("admin.accessCodes.table.description")}</p>
            </div>
          </div>

          <div className="admin-products-table">
            <div className="admin-products-row admin-products-head">
              <span>{t("admin.accessCodes.table.label")}</span>
              <span>{t("admin.accessCodes.table.role")}</span>
              <span>{t("admin.accessCodes.table.status")}</span>
              <span>{t("admin.accessCodes.table.createdAt")}</span>
              <span>{t("admin.accessCodes.table.actions")}</span>
            </div>

            {accessCodes.length === 0 ? (
              <div className="notice">{t("admin.accessCodes.table.empty")}</div>
            ) : (
              accessCodes.map((record) => (
                <div key={record.id} className="admin-products-row">
                  <div className="admin-product-primary">
                    <p className="card-title">{record.label}</p>
                    <p className="muted">
                      <span className={isVipMember(record) ? "vip-text" : undefined}>{t(getMemberRoleKey(record))}</span> /{" "}
                      <span className={isVipMember(record) ? "vip-text" : undefined}>{t(getMemberTierKey(record))}</span> /{" "}
                      {t("admin.userControls.points")}: {record.points}
                    </p>
                    <p className="muted">
                      {t("admin.accessCodes.table.updatedAt")}: {formatDate(record.updatedAt, language)}
                    </p>
                  </div>
                  <span className={isVipMember(record) ? "vip-text" : undefined}>{t(getMemberRoleKey(record))}</span>
                  <span className={`pill${record.active ? "" : " pill-muted"}`}>
                    {record.active ? t("admin.accessCodes.status.active") : t("admin.accessCodes.status.inactive")}
                  </span>
                  <span>{formatDate(record.createdAt, language)}</span>
                  <div className="admin-row-actions">
                    <Link href={`/admin/access-codes?edit=${record.id}`} className="button">
                      {t("admin.accessCodes.action.edit")}
                    </Link>
                    <form action={toggleAccessCodeAction.bind(null, record.id, !record.active)}>
                      <button type="submit" className="button">
                        {record.active ? t("admin.accessCodes.action.disable") : t("admin.accessCodes.action.enable")}
                      </button>
                    </form>
                    <form action={deleteAccessCodeAction.bind(null, record.id)}>
                      <AccessCodeDeleteButton label={record.label} />
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <AccessCodeForm
          action={editingRecord ? updateAccessCodeAction.bind(null, editingRecord.id) : createAccessCodeAction}
          initialValues={initialValues}
          editing={Boolean(editingRecord)}
        />
      </section>
    </main>
  );
}
