import {
  activateAccessCodeVip,
  addOwnedVoucherToAccessCode,
  getAccessCodeById
} from "@/lib/access-codes";
import { getReservedVoucherMap } from "@/lib/pending-checkout-store";
import { canRedeemVipUpgrade } from "@/lib/member-status";
import { AccessCodeRecord, AuthSession, VoucherDefinitionId, VoucherView } from "@/lib/types";
import {
  VOUCHER_DEFINITIONS,
  getOwnedVoucherViews,
  getRedeemableDiscountDefinitions,
  getVoucherDefinition
} from "@/lib/vouchers";

export type VoucherWalletSummary = {
  record: AccessCodeRecord;
  ownedVouchers: VoucherView[];
  activeDiscountVouchers: VoucherView[];
  canRedeemVip: boolean;
  redeemableDiscounts: ReturnType<typeof getRedeemableDiscountDefinitions>;
};

const buildVoucherWalletSummary = (record: AccessCodeRecord): VoucherWalletSummary => {
  const reservations = getReservedVoucherMap(record.id);
  const ownedVouchers = getOwnedVoucherViews(record, reservations);
  const activeDiscountVouchers = ownedVouchers.filter(
    (voucher) => voucher.kind === "discount" && !voucher.usedAt
  );

  return {
    record,
    ownedVouchers,
    activeDiscountVouchers,
    canRedeemVip: canRedeemVipUpgrade({
      role: record.role,
      points: record.points,
      vip: record.vip
    }),
    redeemableDiscounts: getRedeemableDiscountDefinitions(record.points)
  };
};

export const getVoucherWalletForAccessCode = (accessCodeId: string) => {
  const record = getAccessCodeById(accessCodeId);

  if (!record) {
    return undefined;
  }

  return buildVoucherWalletSummary(record);
};

export const getVoucherWalletForSession = (session?: Pick<AuthSession, "subject" | "role">) => {
  if (!session || !["customer", "reseller"].includes(session.role)) {
    return undefined;
  }

  return getVoucherWalletForAccessCode(session.subject);
};

export const redeemVoucherForAccessCode = (accessCodeId: string, definitionId: VoucherDefinitionId) => {
  const record = getAccessCodeById(accessCodeId);

  if (!record) {
    return { ok: false as const, reason: "not-found" as const };
  }

  if (!["customer", "reseller"].includes(record.role)) {
    return { ok: false as const, reason: "forbidden" as const };
  }

  if (definitionId === "vip_upgrade") {
    if (
      !canRedeemVipUpgrade({
        role: record.role,
        points: record.points,
        vip: record.vip
      })
    ) {
      return { ok: false as const, reason: "vip-unavailable" as const };
    }

    const updated = activateAccessCodeVip(accessCodeId);
    return updated ? { ok: true as const, record: updated, definition: VOUCHER_DEFINITIONS.vip_upgrade } : { ok: false as const, reason: "not-found" as const };
  }

  const definition = getVoucherDefinition(definitionId);

  if (record.points < definition.pointCost) {
    return { ok: false as const, reason: "not-enough-points" as const };
  }

  const updated = addOwnedVoucherToAccessCode(accessCodeId, definitionId, definition.pointCost);

  return updated ? { ok: true as const, record: updated, definition } : { ok: false as const, reason: "not-found" as const };
};
