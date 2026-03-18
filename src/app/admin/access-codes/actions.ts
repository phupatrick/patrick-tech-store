"use server";

import { revalidatePath } from "next/cache";

import {
  createAccessCodeRecord,
  deleteAccessCodeRecord,
  setAccessCodeActiveState,
  updateAccessCodeRecord
} from "@/lib/access-codes";
import { requireAdminRole } from "@/lib/auth";
import { AccessCodeFormState, AccessCodeFormValues, emptyAccessCodeFormValues } from "@/lib/access-code-form";
import { createTranslator } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n/server";
import { AccessRole, ResellerTier } from "@/lib/types";

const isAccessRole = (value: string): value is AccessRole =>
  ["admin", "deputy_admin", "reseller", "staff", "customer"].includes(value);
const isResellerTier = (value: string): value is ResellerTier => ["guest", "regular"].includes(value);

const getValuesFromFormData = (formData: FormData): AccessCodeFormValues => {
  const role = String(formData.get("role") ?? "customer");
  const tier = String(formData.get("tier") ?? "guest");

  return {
    code: String(formData.get("code") ?? "").trim(),
    label: String(formData.get("label") ?? "").trim(),
    role: isAccessRole(role) ? role : "customer",
    tier: isResellerTier(tier) ? tier : "guest",
    points: String(formData.get("points") ?? "0").trim(),
    active: formData.get("active") === "on"
  };
};

const validateValues = (
  values: AccessCodeFormValues,
  t: ReturnType<typeof createTranslator>["t"],
  options?: { codeOptional?: boolean }
) => {
  if (!options?.codeOptional && !values.code) {
    return t("admin.accessCodes.validation.codeRequired");
  }

  if (values.code && values.code.length < 4) {
    return t("admin.accessCodes.validation.codeTooShort");
  }

  if (!values.label) {
    return t("admin.accessCodes.validation.labelRequired");
  }

  if (!isAccessRole(values.role)) {
    return t("admin.accessCodes.validation.invalidRole");
  }

  const points = Number(values.points);

  if (!Number.isFinite(points) || points < 0) {
    return t("admin.accessCodes.validation.pointsInvalid");
  }

  return undefined;
};

const revalidateAccessCodeViews = () => {
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/admin/access-codes");
  revalidatePath("/admin/login");
};

export const createAccessCodeAction = async (
  _prevState: AccessCodeFormState,
  formData: FormData
): Promise<AccessCodeFormState> => {
  await requireAdminRole("/admin/access-codes");
  const language = await getRequestLanguage();
  const { t } = createTranslator(language);
  const values = getValuesFromFormData(formData);
  const error = validateValues(values, t);

  if (error) {
    return { error, values };
  }

  createAccessCodeRecord({
    ...values,
    points: Number(values.points)
  });
  revalidateAccessCodeViews();
  return { values: emptyAccessCodeFormValues };
};

export const updateAccessCodeAction = async (
  accessCodeId: string,
  _prevState: AccessCodeFormState,
  formData: FormData
): Promise<AccessCodeFormState> => {
  await requireAdminRole("/admin/access-codes");
  const language = await getRequestLanguage();
  const { t } = createTranslator(language);
  const values = getValuesFromFormData(formData);
  const error = validateValues(values, t, { codeOptional: true });

  if (error) {
    return { error, values };
  }

  const updated = updateAccessCodeRecord(accessCodeId, {
    code: values.code || undefined,
    label: values.label,
    role: values.role,
    tier: values.tier,
    points: Number(values.points),
    active: values.active
  });

  if (!updated) {
    return { error: t("admin.accessCodes.validation.notFound"), values };
  }

  revalidateAccessCodeViews();
  return {
    values: {
      code: "",
      label: updated.label,
      role: updated.role,
      tier: updated.tier,
      points: String(updated.points),
      active: updated.active
    }
  };
};

export const deleteAccessCodeAction = async (accessCodeId: string) => {
  await requireAdminRole("/admin/access-codes");
  deleteAccessCodeRecord(accessCodeId);
  revalidateAccessCodeViews();
};

export const toggleAccessCodeAction = async (accessCodeId: string, active: boolean) => {
  await requireAdminRole("/admin/access-codes");
  setAccessCodeActiveState(accessCodeId, active);
  revalidateAccessCodeViews();
};
