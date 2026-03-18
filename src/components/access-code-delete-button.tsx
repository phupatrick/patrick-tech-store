"use client";

import { useFormStatus } from "react-dom";

import { useI18n } from "@/components/i18n-provider";

export function AccessCodeDeleteButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const { t } = useI18n();

  return (
    <button
      type="submit"
      className="button button-danger"
      disabled={pending}
      onClick={(event) => {
        if (window.confirm(t("admin.accessCodes.confirmDelete", { label }))) {
          return;
        }

        event.preventDefault();
      }}
    >
      {pending ? t("admin.delete.pending") : t("admin.accessCodes.action.delete")}
    </button>
  );
}
