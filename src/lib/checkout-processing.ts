import { addAccessCodePoints, markVoucherUsed } from "@/lib/access-codes";
import { calculateRewardPoints } from "@/lib/loyalty";
import { deletePendingCheckout, getPendingCheckoutById, getPendingCheckoutByToken } from "@/lib/pending-checkout-store";
import { createOrderFromPendingCheckout } from "@/lib/order-store";
import { getProductById } from "@/lib/product-store";
import { Order, PendingCheckout } from "@/lib/types";

type CheckoutDecision = "confirm" | "reject";

export type CheckoutDecisionResult =
  | {
      ok: false;
      status: number;
      code: "invalid" | "not-found" | "product-not-found";
      title: string;
      description: string;
    }
  | {
      ok: true;
      status: number;
      code: "rejected" | "confirmed";
      title: string;
      description: string;
      pendingCheckout: PendingCheckout;
      order?: Order;
      pointsAwarded?: number;
    };

const INVALID_RESULT: CheckoutDecisionResult = {
  ok: false,
  status: 400,
  code: "invalid",
  title: "Lien ket khong hop le",
  description: "Khong the xu ly yeu cau nay."
};

type ResolvePendingCheckoutInput =
  | {
      pendingCheckoutId: string;
      token?: never;
    }
  | {
      pendingCheckoutId?: never;
      token: string;
    };

const resolvePendingCheckout = (input: ResolvePendingCheckoutInput) => {
  if (input.pendingCheckoutId !== undefined) {
    return getPendingCheckoutById(input.pendingCheckoutId);
  }

  return getPendingCheckoutByToken(input.token as string);
};

export const processPendingCheckoutDecision = (
  input: ResolvePendingCheckoutInput & { decision: CheckoutDecision }
): CheckoutDecisionResult => {
  const pendingCheckout = resolvePendingCheckout(input);

  if (!pendingCheckout) {
    return {
      ok: false,
      status: 404,
      code: "not-found",
      title: "Don tam khong con",
      description: "Don hang tam da het han hoac da duoc xu ly truoc do."
    };
  }

  if (input.decision === "reject") {
    deletePendingCheckout(pendingCheckout.id);

    return {
      ok: true,
      status: 200,
      code: "rejected",
      title: "Da tu choi don",
      description: "Don hang tam da bi xoa ngay lap tuc va voucher duoc mo lai de dung cho lan mua khac.",
      pendingCheckout
    };
  }

  const product = getProductById(pendingCheckout.productId);

  if (!product) {
    deletePendingCheckout(pendingCheckout.id);
    return {
      ok: false,
      status: 404,
      code: "product-not-found",
      title: "Khong tim thay san pham",
      description: "Don tam da bi xoa vi san pham khong con ton tai."
    };
  }

  const order = createOrderFromPendingCheckout(pendingCheckout, product);

  if (pendingCheckout.voucherId) {
    markVoucherUsed(pendingCheckout.accessCodeId, pendingCheckout.voucherId);
  }

  let pointsAwarded = 0;

  if (["customer", "reseller"].includes(pendingCheckout.customerRole) && pendingCheckout.accessCodeId !== "guest") {
    pointsAwarded = calculateRewardPoints(pendingCheckout.finalPrice, product.points);
    addAccessCodePoints(pendingCheckout.accessCodeId, pointsAwarded);
  }

  deletePendingCheckout(pendingCheckout.id);

  return {
    ok: true,
    status: 200,
    code: "confirmed",
    title: "Da xac nhan don",
    description: `Ma don ${order.id} da duoc tao, bao hanh duoc luu len web va diem thuong da duoc cong cho tai khoan mua hang.`,
    pendingCheckout,
    order,
    pointsAwarded
  };
};

export const validateCheckoutDecision = (value?: string | null): value is CheckoutDecision =>
  value === "confirm" || value === "reject";

export const getInvalidCheckoutDecisionResult = () => INVALID_RESULT;
