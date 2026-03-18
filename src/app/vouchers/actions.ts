"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/lib/auth";
import { VoucherDefinitionId } from "@/lib/types";
import { redeemVoucherForAccessCode } from "@/lib/voucher-wallet";

const redirectWithNotice = (notice: string) => {
  redirect(`/vouchers?notice=${encodeURIComponent(notice)}`);
};

export const redeemVoucherAction = async (definitionId: VoucherDefinitionId) => {
  const session = await getAuthSession();

  if (!session || !["customer", "reseller"].includes(session.role)) {
    return redirectWithNotice("forbidden");
  }

  const result = redeemVoucherForAccessCode(session.subject, definitionId);

  revalidatePath("/");
  revalidatePath("/vouchers");

  if (!result.ok) {
    return redirectWithNotice(result.reason);
  }

  return redirectWithNotice(definitionId === "vip_upgrade" ? "vip-redeemed" : "voucher-redeemed");
};
