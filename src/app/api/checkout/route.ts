import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import {
  convertVndToDisplayAmount,
  formatCurrencyValue,
  getCurrencySettings,
  resolveCurrencyCode,
  roundCurrencyAmount
} from "@/lib/currency";
import { isLanguage, translate } from "@/lib/i18n";
import { createPendingCheckoutRecord, getReservedVoucherMap, listPendingCheckouts, updatePendingCheckout } from "@/lib/pending-checkout-store";
import { generateUniqueOrderCode, listOrders } from "@/lib/order-store";
import { getPublicProductView } from "@/lib/pricing";
import { getProductById } from "@/lib/product-store";
import { getClientRequestContext } from "@/lib/request-context";
import { sendPendingCheckoutToTelegram } from "@/lib/telegram";
import { VoucherDefinitionId } from "@/lib/types";
import { calculateVoucherDiscount } from "@/lib/vouchers";
import { getVoucherWalletForAccessCode } from "@/lib/voucher-wallet";

import { TELEGRAM_DIRECT_URL, WHATSAPP_DIRECT_URL, ZALO_DIRECT_URL } from "@/lib/contact-links";

const createCheckoutOrderCode = () => {
  const existingCodes = new Set(listOrders().map((order) => order.id));

  listPendingCheckouts().forEach((pendingCheckout) => {
    if (pendingCheckout.orderCode) {
      existingCodes.add(pendingCheckout.orderCode);
    }
  });

  return generateUniqueOrderCode(existingCodes);
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    productId?: string;
    countryCode?: string;
    language?: string;
    voucherId?: string;
    contactMethod?: "zalo" | "telegram" | "whatsapp";
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
  const currency = resolveCurrencyCode(language, request.cookies.get("preferred-currency")?.value);
  const currencySettings = await getCurrencySettings(language, currency);
  const productView = await getPublicProductView(product, language, session, currency);
  const contactMethod =
    body.contactMethod === "zalo" || body.contactMethod === "telegram" || body.contactMethod === "whatsapp"
      ? body.contactMethod
      : language === "vi" && countryCode === "VN"
        ? "zalo"
        : "whatsapp";
  const baseContactUrl =
    contactMethod === "zalo"
      ? ZALO_DIRECT_URL
      : contactMethod === "whatsapp"
        ? WHATSAPP_DIRECT_URL
        : TELEGRAM_DIRECT_URL;
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
  const displayOriginalPrice = productView.displayVisiblePrice;
  const displayDiscountAmount = roundCurrencyAmount(
    convertVndToDisplayAmount(discountAmount, currencySettings),
    currencySettings.currency
  );
  const displayFinalPrice = roundCurrencyAmount(
    Math.max(0, displayOriginalPrice - displayDiscountAmount),
    currencySettings.currency
  );
  const formattedOriginalPrice = formatCurrencyValue(displayOriginalPrice, currencySettings);
  const formattedDiscount = formatCurrencyValue(displayDiscountAmount, currencySettings);
  const formattedFinalPrice = formatCurrencyValue(displayFinalPrice, currencySettings);
  const orderCode = createCheckoutOrderCode();
  const voucherLine = voucherDefinitionId
    ? translate(language, "checkout.voucherApplied", {
        voucher: translate(language, `voucher.def.${voucherDefinitionId}.name` as never),
        discount: formattedDiscount
      })
    : translate(language, "checkout.voucherNone");
  let pendingCheckoutId: string | undefined;
  let pendingCheckoutExpiresAt: string | undefined;
  const orderCodeLabel = language === "vi" ? "Mã đơn hàng" : "Order code";
  const orderContent = [
    `${orderCodeLabel}: ${orderCode}`,
    `${translate(language, "checkout.content.product")}: ${productView.name}`,
    `${translate(language, "checkout.content.originalPrice")}: ${formattedOriginalPrice}`,
    `${translate(language, "checkout.content.discount")}: ${formattedDiscount}`,
    `${translate(language, "checkout.content.finalPrice")}: ${formattedFinalPrice}`,
    `${translate(language, "checkout.content.channel")}: ${translate(language, `checkout.channel.${contactMethod}` as never)}`,
    `${translate(language, "checkout.content.voucher")}: ${
      voucherDefinitionId ? translate(language, `voucher.def.${voucherDefinitionId}.name` as never) : translate(language, "checkout.voucherNoneShort")
    }`
  ].join("\n");

  try {
    const pendingCheckout = createPendingCheckoutRecord({
      orderCode,
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
      orderContent,
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

    pendingCheckoutId = pendingCheckout.id;
    pendingCheckoutExpiresAt = pendingCheckout.expiresAt;
  } catch (error) {
    console.error("checkout: could not persist pending checkout", error);

    if (voucherId) {
      return NextResponse.json({ error: translate(language, "checkout.error.generic") }, { status: 500 });
    }
  }

  const message = `${orderCodeLabel}: ${orderCode}\n${translate(language, "checkout.message", {
    productName: productView.name,
    price: formattedFinalPrice,
    originalPrice: formattedOriginalPrice,
    voucherLine,
    requestId: orderCode
  })}`;
  const redirectUrl = `${baseContactUrl}${separator}text=${encodeURIComponent(message)}`;

  if (pendingCheckoutId) {
    try {
      const finalizedPendingCheckout = updatePendingCheckout(pendingCheckoutId, (record) => ({
        ...record,
        contactUrl: redirectUrl,
        messageText: message
      }));

      if (!finalizedPendingCheckout) {
        throw new Error("Could not finalize pending checkout.");
      }

      pendingCheckoutExpiresAt = finalizedPendingCheckout.expiresAt;
      await sendPendingCheckoutToTelegram(finalizedPendingCheckout, request.nextUrl.origin);
    } catch (error) {
      console.error("checkout: could not finalize pending checkout", error);

      if (voucherId) {
        return NextResponse.json({ error: translate(language, "checkout.error.generic") }, { status: 500 });
      }
    }
  }

  return NextResponse.json({
    redirectUrl,
    contactMethod,
    orderCode,
    pendingCheckoutId,
    expiresAt: pendingCheckoutExpiresAt
  });
}
