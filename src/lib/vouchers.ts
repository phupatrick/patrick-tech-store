import { AccessCodeRecord, VoucherDefinition, VoucherDefinitionId, VoucherView } from "@/lib/types";

export const VOUCHER_DEFINITIONS: Record<VoucherDefinitionId, VoucherDefinition> = {
  vip_upgrade: {
    id: "vip_upgrade",
    kind: "vip_upgrade",
    pointCost: 10000
  },
  discount_10000: {
    id: "discount_10000",
    kind: "discount",
    pointCost: 200,
    discountAmount: 10000,
    minOrderAmount: 50000
  },
  discount_20000: {
    id: "discount_20000",
    kind: "discount",
    pointCost: 350,
    discountAmount: 20000,
    minOrderAmount: 100000
  },
  discount_50000: {
    id: "discount_50000",
    kind: "discount",
    pointCost: 600,
    discountAmount: 50000,
    minOrderAmount: 400000
  }
};

export const listVoucherDefinitions = () => Object.values(VOUCHER_DEFINITIONS);

export const getVoucherDefinition = (definitionId: VoucherDefinitionId) => VOUCHER_DEFINITIONS[definitionId];

export const getDiscountVoucherDefinitions = () =>
  listVoucherDefinitions().filter((definition) => definition.kind === "discount");

export const getOwnedVoucherViews = (
  record: Pick<AccessCodeRecord, "vouchers">,
  reservations?: Map<string, { checkoutId: string; expiresAt: string }>
): VoucherView[] =>
  (record.vouchers ?? [])
    .map((voucher) => {
      const definition = getVoucherDefinition(voucher.definitionId);
      const reservation = reservations?.get(voucher.id);

      return {
        id: voucher.id,
        definitionId: voucher.definitionId,
        kind: definition.kind,
        pointCost: definition.pointCost,
        discountAmount: definition.discountAmount,
        minOrderAmount: definition.minOrderAmount,
        createdAt: voucher.createdAt,
        usedAt: voucher.usedAt,
        reservedUntil: reservation?.expiresAt,
        reservedByCheckoutId: reservation?.checkoutId
      } satisfies VoucherView;
    })
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));

export const getRedeemableDiscountDefinitions = (points: number) =>
  getDiscountVoucherDefinitions().filter((definition) => points >= definition.pointCost);

export const calculateVoucherDiscount = (definitionId: VoucherDefinitionId, amount: number) => {
  const definition = getVoucherDefinition(definitionId);

  if (definition.kind !== "discount" || !definition.discountAmount || !definition.minOrderAmount) {
    return 0;
  }

  if (amount < definition.minOrderAmount) {
    return 0;
  }

  return Math.min(amount, definition.discountAmount);
};
