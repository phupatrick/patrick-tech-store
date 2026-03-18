"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { useCurrency } from "@/components/currency-provider";
import { useI18n } from "@/components/i18n-provider";
import type { OrderFormState } from "@/lib/order-form";
import { emptyOrderFormValues } from "@/lib/order-form";

type AdminOrderFormProps = {
  action: (state: OrderFormState, formData: FormData) => Promise<OrderFormState>;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useI18n();

  return (
    <button type="submit" className="button button-primary" disabled={pending}>
      {pending ? t("admin.orders.form.pending") : t("admin.orders.form.submit")}
    </button>
  );
}

export function AdminOrderForm({ action }: AdminOrderFormProps) {
  const { t } = useI18n();
  const { settings } = useCurrency();
  const [state, formAction] = useActionState(action, { values: emptyOrderFormValues });
  const formKey = `${state.values.name}-${state.values.content}-${state.values.warrantyUntil}-${state.values.finalPrice}-${state.values.costPrice}-${state.createdOrderId ?? ""}`;

  return (
    <form key={formKey} action={formAction} className="surface page-stack admin-form">
      <div className="section-head">
        <div>
          <h2 className="section-title">{t("admin.orders.form.title")}</h2>
          <p className="muted">{t("admin.orders.form.description")}</p>
        </div>
      </div>

      {state.error ? <div className="admin-form-error">{state.error}</div> : null}
      {state.success ? (
        <div className="notice order-success">
          <p className="card-title">{state.success}</p>
          <p className="muted">{t("admin.orders.form.createdCode", { id: state.createdOrderId ?? "" })}</p>
        </div>
      ) : null}

      <label className="field">
        <span className="field-label">{t("admin.orders.form.field.name")}</span>
        <input
          name="name"
          defaultValue={state.values.name}
          className="input"
          placeholder={t("admin.orders.form.placeholder.name")}
          required
        />
      </label>

      <label className="field">
        <span className="field-label">{t("admin.orders.form.field.content")}</span>
        <textarea
          name="content"
          defaultValue={state.values.content}
          className="input textarea"
          rows={7}
          placeholder={t("admin.orders.form.placeholder.content")}
          required
        />
      </label>

      <label className="field">
        <span className="field-label">{t("admin.orders.form.field.warrantyUntil")}</span>
        <input name="warrantyUntil" type="date" defaultValue={state.values.warrantyUntil} className="input" required />
        <span className="field-help">{t("admin.orders.form.help.warrantyUntil")}</span>
      </label>

      <div className="admin-form-grid">
        <label className="field">
          <span className="field-label">
            {t("admin.orders.form.field.finalPrice")} ({settings.currency})
          </span>
          <input
            name="finalPrice"
            type="number"
            min="0"
            step={settings.currency === "USD" ? "0.01" : "1000"}
            defaultValue={state.values.finalPrice}
            className="input"
            placeholder={settings.currency === "USD" ? "19.99" : "249000"}
          />
        </label>

        <label className="field">
          <span className="field-label">
            {t("admin.orders.form.field.costPrice")} ({settings.currency})
          </span>
          <input
            name="costPrice"
            type="number"
            min="0"
            step={settings.currency === "USD" ? "0.01" : "1000"}
            defaultValue={state.values.costPrice}
            className="input"
            placeholder={settings.currency === "USD" ? "15.00" : "180000"}
          />
        </label>
      </div>

      <SubmitButton />
    </form>
  );
}
