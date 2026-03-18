"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth";
import { convertDisplayAmountToVnd, getCurrencySettings } from "@/lib/currency";
import { OrderFormState, OrderFormValues, emptyOrderFormValues } from "@/lib/order-form";
import { createTranslator } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n/server";
import { createOrderRecord } from "@/lib/order-store";

const getValuesFromFormData = (formData: FormData): OrderFormValues => ({
  name: String(formData.get("name") ?? "").trim(),
  content: String(formData.get("content") ?? "").trim(),
  warrantyUntil: String(formData.get("warrantyUntil") ?? "").trim(),
  finalPrice: String(formData.get("finalPrice") ?? "").trim(),
  costPrice: String(formData.get("costPrice") ?? "").trim()
});

const validateValues = (
  values: OrderFormValues,
  t: ReturnType<typeof createTranslator>["t"]
) => {
  if (!values.name) {
    return t("admin.orders.validation.nameRequired");
  }

  if (!values.content) {
    return t("admin.orders.validation.contentRequired");
  }

  if (!values.warrantyUntil) {
    return t("admin.orders.validation.warrantyRequired");
  }

  if (Number.isNaN(Date.parse(`${values.warrantyUntil}T23:59:59.999`))) {
    return t("admin.orders.validation.warrantyInvalid");
  }

  const finalPrice = Number(values.finalPrice || "0");
  const costPrice = Number(values.costPrice || "0");

  if ((values.finalPrice && (!Number.isFinite(finalPrice) || finalPrice < 0)) || (values.costPrice && (!Number.isFinite(costPrice) || costPrice < 0))) {
    return t("admin.orders.validation.amountInvalid");
  }

  return undefined;
};

const revalidateOrderViews = () => {
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/warranty");
};

export const createOrderAction = async (
  _prevState: OrderFormState,
  formData: FormData
): Promise<OrderFormState> => {
  await requireAdminUser("/admin/orders");
  const language = await getRequestLanguage();
  const currencySettings = await getCurrencySettings(language);
  const { t } = createTranslator(language);
  const values = getValuesFromFormData(formData);
  const error = validateValues(values, t);

  if (error) {
    return { error, values };
  }

  const finalPrice = values.finalPrice
    ? Math.round(convertDisplayAmountToVnd(Number(values.finalPrice), currencySettings))
    : undefined;
  const costPrice = values.costPrice
    ? Math.round(convertDisplayAmountToVnd(Number(values.costPrice), currencySettings))
    : undefined;
  const order = createOrderRecord({
    ...values,
    source: "manual",
    originalPrice: finalPrice,
    discountAmount: 0,
    finalPrice,
    costPrice,
    profit: typeof finalPrice === "number" && typeof costPrice === "number" ? finalPrice - costPrice : undefined
  });
  revalidateOrderViews();

  return {
    success: t("admin.orders.successCreated", { id: order.id }),
    createdOrderId: order.id,
    values: emptyOrderFormValues
  };
};
