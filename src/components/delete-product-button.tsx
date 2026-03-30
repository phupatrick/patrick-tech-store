"use client";

import { useFormStatus } from "react-dom";

import { useI18n } from "@/components/i18n-provider";

export function DeleteProductButton({ productName, disabled = false }: { productName: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  const { t } = useI18n();

  return (
    <button
      type="submit"
      className="button button-danger"
      disabled={pending || disabled}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }

        if (window.confirm(t("admin.delete.confirm", { name: productName }))) {
          return;
        }

        event.preventDefault();
      }}
    >
      {pending ? t("admin.delete.pending") : t("admin.delete.action")}
    </button>
  );
}
