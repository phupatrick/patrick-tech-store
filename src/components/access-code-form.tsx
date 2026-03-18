"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { AccessCodeFormState } from "@/lib/access-code-form";
import { useI18n } from "@/components/i18n-provider";
import { emptyAccessCodeFormValues, type AccessCodeFormValues } from "@/lib/access-code-form";
import { AccessRole, ResellerTier } from "@/lib/types";

type AccessCodeFormProps = {
  action: (state: AccessCodeFormState, formData: FormData) => Promise<AccessCodeFormState>;
  initialValues?: AccessCodeFormValues;
  editing?: boolean;
};

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  const { t } = useI18n();

  return (
    <button type="submit" className="button button-primary" disabled={pending}>
      {pending
        ? t("admin.form.submit.saving")
        : editing
          ? t("admin.accessCodes.form.submitUpdate")
          : t("admin.accessCodes.form.submitCreate")}
    </button>
  );
}

const roles: AccessRole[] = ["admin", "deputy_admin", "staff", "reseller", "customer"];
const tiers: ResellerTier[] = ["guest", "regular"];
export function AccessCodeForm({ action, initialValues, editing = false }: AccessCodeFormProps) {
  const { t } = useI18n();
  const [state, formAction] = useActionState(action, {
    values: initialValues ?? emptyAccessCodeFormValues
  });
  const formKey = `${editing ? "edit" : "create"}-${state.values.label}-${state.values.role}-${state.values.tier}-${state.values.points}-${state.values.active}-${state.values.code}`;

  return (
    <form key={formKey} action={formAction} className="surface page-stack admin-form">
      <div className="section-head">
        <div>
          <h2 className="section-title">
            {editing ? t("admin.accessCodes.form.editTitle") : t("admin.accessCodes.form.createTitle")}
          </h2>
          <p className="muted">
            {editing ? t("admin.accessCodes.form.editDescription") : t("admin.accessCodes.form.createDescription")}
          </p>
        </div>
      </div>

      {state.error ? <div className="admin-form-error">{state.error}</div> : null}

      <label className="field">
        <span className="field-label">{t("admin.accessCodes.form.code")}</span>
        <input
          name="code"
          type="password"
          defaultValue={state.values.code}
          className="input"
          placeholder={t("admin.accessCodes.form.placeholderCode")}
          required={!editing}
        />
        {editing ? <span className="field-help">{t("admin.accessCodes.form.codeEditHint")}</span> : null}
      </label>

      <label className="field">
        <span className="field-label">{t("admin.accessCodes.form.label")}</span>
        <input
          name="label"
          defaultValue={state.values.label}
          className="input"
          placeholder={t("admin.accessCodes.form.placeholderLabel")}
          required
        />
      </label>

      <div className="admin-form-grid">
        <label className="field">
          <span className="field-label">{t("admin.accessCodes.form.role")}</span>
          <select name="role" defaultValue={state.values.role} className="select">
            {roles.map((role) => (
              <option key={role} value={role}>
                {t(`admin.accessCodes.role.${role}` as const)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">{t("reseller.account.tier")}</span>
          <select name="tier" defaultValue={state.values.tier} className="select">
            {tiers.map((tier) => (
              <option key={tier} value={tier}>
                {t(`tier.${tier}` as const)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="admin-form-grid">
        <label className="field">
          <span className="field-label">{t("admin.userControls.points")}</span>
          <input
            name="points"
            type="number"
            min="0"
            defaultValue={state.values.points}
            className="input"
            placeholder="0"
            required
          />
          <span className="field-help">{t("member.vipThreshold")}</span>
        </label>

        <label className="toggle" style={{ alignSelf: "end" }}>
          <input type="checkbox" name="active" defaultChecked={state.values.active} />
          <span>{t("admin.accessCodes.form.active")}</span>
        </label>
      </div>

      <div className="row row-actions">
        <SubmitButton editing={editing} />
        {editing ? (
          <Link href="/admin/access-codes" className="button">
            {t("admin.accessCodes.form.cancel")}
          </Link>
        ) : null}
      </div>
    </form>
  );
}
