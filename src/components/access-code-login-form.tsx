"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { LoginFormState } from "@/app/admin/login/actions";
import { useI18n } from "@/components/i18n-provider";

type AccessCodeLoginFormProps = {
  action: (state: LoginFormState, formData: FormData) => Promise<LoginFormState>;
  nextPath: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useI18n();

  return (
    <button type="submit" className="button button-primary" disabled={pending}>
      {pending ? t("admin.login.pending") : t("admin.login.submit")}
    </button>
  );
}

export function AccessCodeLoginForm({ action, nextPath }: AccessCodeLoginFormProps) {
  const { t } = useI18n();
  const [state, formAction] = useActionState(action, { code: "" });

  return (
    <form action={formAction} className="surface page-stack admin-form" style={{ maxWidth: 560, margin: "0 auto" }}>
      {state.error ? <div className="admin-form-error">{state.error}</div> : null}

      <input type="hidden" name="next" value={nextPath} />

      <label className="field">
        <span className="field-label">{t("admin.login.field.code")}</span>
        <input
          name="code"
          type="password"
          defaultValue={state.code}
          className="input"
          placeholder={t("admin.accessCodes.form.placeholderCode")}
          autoComplete="current-password"
          required
        />
      </label>

      <div className="row row-actions">
        <SubmitButton />
      </div>
    </form>
  );
}
