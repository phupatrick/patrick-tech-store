import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { formatCurrency, getCurrencySettings } from "@/lib/currency";
import { isLanguage, translate } from "@/lib/i18n";
import { createPendingCheckoutRecord, getReservedVoucherMap, updatePendingCheckout } from "@/lib/pending-checkout-store";
import { getPublicProductView } from "@/lib/pricing";
import { getProductById } from "@/lib/product-store";
import { getClientRequestContext } from "@/lib/request-context";
import { sendPendingCheckoutToTelegram } from "@/lib/telegram";
import { VoucherDefinitionId } from "@/lib/types";
import { calculateVoucherDiscount } from "@/lib/vouchers";
import { getVoucherWalletForAccessCode } from "@/lib/voucher-wallet";

const ZALO_URL = "https://zalo.me/0933684560";
const TELEGRAM_URL = "https://t.me/Patrick_Tech_Fullapp";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    productId?: string;
    countryCode?: string;
    language?: string;
    voucherId?: string;
    contactMethod?: "zalo" | "telegram";
  };
  const session = await getAuthSession();
  const product = body.productId ? getProductById(body.productId) : undefined;

  if (!product || !product.published) {
    return NextResponse.json({ error: "Unknown product." }, { status: 404 });
  }

  const requestContext = getClientRequestContext(request.headers);
  const fallbackCountryCode = (body.countryCode || "").toUpperCase() || "INTL";
  const countryCode = requestContext.countryCode ?? fallbackCountryCode;
  const language = isLanguage(body.language)
    ? body.language
    : countryCode === "VN"
      ? "vi"
      : requestContext.languageHint;
  const currencySettings = await getCurrencySettings(language);
  const productView = getPublicProductView(product, language, session);
  const contactMethod =
    body.contactMethod === "zalo" || body.contactMethod === "telegram"
      ? body.contactMethod
      : countryCode === "VN"
        ? "zalo"
        : "telegram";
  const baseContactUrl = contactMethod === "zalo" ? ZALO_URL : TELEGRAM_URL;
  const separator = baseContactUrl.includes("?") ? "&" : "?";
  let discountAmount = 0;
  let voucherId: string | undefined;
  let voucherDefinitionId: VoucherDefinitionId | undefined;

  if (body.voucherId) {
    if (!session || !["customer", "reseller"].includes(session.role)) {
      return NextResponse.json({ error: "Voucher requires a signed-in customer account." }, { status: 403 });
    }

    const wallet = getVoucherWalletForAccessCode(session.subject);

    if (!wallet) {
      return NextResponse.json({ error: "Voucher wallet not found." }, { status: 404 });
    }

    const selectedVoucher = wallet.activeDiscountVouchers.find((voucher) => voucher.id === body.voucherId);
    const reservationMap = getReservedVoucherMap(session.subject);
    const existingReservation = reservationMap.get(body.voucherId);

    if (!selectedVoucher || selectedVoucher.usedAt) {
      return NextResponse.json({ error: "Voucher is not available." }, { status: 400 });
    }

    if (existingReservation) {
      return NextResponse.json({ error: "Voucher is currently reserved by another pending checkout." }, { status: 409 });
    }

    discountAmount = calculateVoucherDiscount(selectedVoucher.definitionId, productView.visiblePrice);

    if (discountAmount <= 0) {
      return NextResponse.json({ error: "Voucher does not apply to this product." }, { status: 400 });
    }

    voucherId = selectedVoucher.id;
    voucherDefinitionId = selectedVoucher.definitionId;
  }

  const finalPrice = Math.max(0, productView.visiblePrice - discountAmount);
  const formattedOriginalPrice = formatCurrency(productView.visiblePrice, currencySettings);
  const formattedDiscount = formatCurrency(discountAmount, currencySettings);
  const formattedFinalPrice = formatCurrency(finalPrice, currencySettings);
  const voucherLine = voucherDefinitionId
    ? translate(language, "checkout.voucherApplied", {
        voucher: translate(language, `voucher.def.${voucherDefinitionId}.name` as never),
        discount: formattedDiscount
      })
    : translate(language, "checkout.voucherNone");

  const pendingCheckout = createPendingCheckoutRecord({
    language,
    countryCode: countryCode || "INTL",
    accessCodeId: session?.subject ?? "guest",
    customerLabel: session?.label ?? translate(language, "role.user.guest"),
    customerRole: session?.role ?? "customer",
    customerTier: session?.tier ?? "guest",
    customerVip: Boolean(session?.vip),
    productId: product.id,
    productName: productView.name,
    orderName: productView.name,
    orderContent: [
      `${translate(language, "checkout.content.product")}: ${productView.name}`,
      `${translate(language, "checkout.content.originalPrice")}: ${formattedOriginalPrice}`,
      `${translate(language, "checkout.content.discount")}: ${formattedDiscount}`,
      `${translate(language, "checkout.content.finalPrice")}: ${formattedFinalPrice}`,
      `${translate(language, "checkout.content.channel")}: ${translate(language, `checkout.channel.${contactMethod}` as never)}`,
      `${translate(language, "checkout.content.voucher")}: ${
        voucherDefinitionId ? translate(language, `voucher.def.${voucherDefinitionId}.name` as never) : translate(language, "checkout.voucherNoneShort")
      }`
    ].join("\n"),
    originalPrice: productView.visiblePrice,
    discountAmount,
    finalPrice,
    currencyCode: currencySettings.currency,
    displayPrice: formattedFinalPrice,
    contactUrl: baseContactUrl,
    messageText: "",
    customerIp: requestContext.clientIp,
    customerAddress: requestContext.addressLabel,
    voucherId,
    voucherDefinitionId
  });

  const message = translate(language, "checkout.message", {
    productName: productView.name,
    price: formattedFinalPrice,
    originalPrice: formattedOriginalPrice,
    voucherLine,
    requestId: pendingCheckout.id.slice(0, 8).toUpperCase()
  });
  const redirectUrl = `${baseContactUrl}${separator}text=${encodeURIComponent(message)}`;
  const finalizedPendingCheckout = updatePendingCheckout(pendingCheckout.id, (record) => ({
    ...record,
    contactUrl: redirectUrl,
    messageText: message
  }));

  if (!finalizedPendingCheckout) {
    return NextResponse.json({ error: "Could not create pending checkout." }, { status: 500 });
  }

  await sendPendingCheckoutToTelegram(finalizedPendingCheckout, request.nextUrl.origin);

  return NextResponse.json({
    redirectUrl,
    contactMethod,
    pendingCheckoutId: finalizedPendingCheckout.id,
    expiresAt: finalizedPendingCheckout.expiresAt
  });
}
