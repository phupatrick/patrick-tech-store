"use server";

import { redirect } from "next/navigation";

import { authenticateWithAccessCode, clearAuthSession } from "@/lib/auth";
import { createTranslator } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n/server";

export type LoginFormState = {
  error?: string;
  code: string;
};

export const loginWithAccessCodeAction = async (
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> => {
  const language = await getRequestLanguage();
  const { t } = createTranslator(language);
  const code = String(formData.get("code") ?? "").trim();
  const nextPath = String(formData.get("next") ?? "/admin/products");

  const session = await authenticateWithAccessCode(code);

  if (!session) {
    return { error: t("admin.login.validation.invalidCode"), code };
  }

  if (!["admin", "deputy_admin", "staff"].includes(session.role)) {
    await clearAuthSession();
    return { error: t("admin.login.validation.forbidden"), code: "" };
  }

  redirect(nextPath.startsWith("/") ? nextPath : "/admin/products");
};

export const loginFromHeaderAction = async (
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> => {
  const language = await getRequestLanguage();
  const { t } = createTranslator(language);
  const code = String(formData.get("code") ?? "").trim();
  const nextPath = String(formData.get("next") ?? "/");
  const session = await authenticateWithAccessCode(code);

  if (!session) {
    return { error: t("admin.login.validation.invalidCode"), code };
  }

  redirect(nextPath.startsWith("/") ? nextPath : "/");
};
