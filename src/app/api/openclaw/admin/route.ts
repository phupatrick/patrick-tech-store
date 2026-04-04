import { NextRequest, NextResponse } from "next/server";

import { processPendingCheckoutDecision } from "@/lib/checkout-processing";
import { buildDailySalesReport, getTodayReportDate } from "@/lib/daily-report";
import { getOrderById, listOrders } from "@/lib/order-store";
import { listPendingCheckouts } from "@/lib/pending-checkout-store";

const REPORT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PENDING_TO_SHOW = 20;
const MAX_ORDERS_TO_SHOW = 20;

const getOpenClawAdminToken = () =>
  process.env.OPENCLAW_ADMIN_TOKEN ??
  process.env.TELEGRAM_WEB_ADMIN_SECRET ??
  process.env.AUTH_SESSION_SECRET;

const isAuthorizedOpenClawRequest = (request: NextRequest) => {
  const configuredToken = getOpenClawAdminToken();

  if (!configuredToken) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : undefined;
  const explicitToken = request.headers.get("x-openclaw-admin-token")?.trim();
  const providedToken = explicitToken || bearerToken;

  return providedToken === configuredToken;
};

const buildDashboardPayload = () => {
  const today = getTodayReportDate();
  const report = buildDailySalesReport(today);

  return {
    date: today,
    pendingCount: listPendingCheckouts().length,
    totalOrders: report.totalOrders,
    grossRevenue: report.grossRevenue,
    totalDiscount: report.totalDiscount,
    netRevenue: report.netRevenue,
    totalCost: report.totalCost,
    totalProfit: report.totalProfit
  };
};

const buildReportPayload = (date?: string) => {
  const resolvedDate = date && REPORT_DATE_PATTERN.test(date) ? date : getTodayReportDate();
  return buildDailySalesReport(resolvedDate);
};

const handleGetAction = (request: NextRequest) => {
  const action = request.nextUrl.searchParams.get("action")?.trim().toLowerCase() ?? "dashboard";

  switch (action) {
    case "dashboard":
      return NextResponse.json({ ok: true, action, data: buildDashboardPayload() });
    case "pending":
      return NextResponse.json({
        ok: true,
        action,
        data: {
          count: listPendingCheckouts().length,
          items: listPendingCheckouts().slice(0, MAX_PENDING_TO_SHOW)
        }
      });
    case "orders":
      return NextResponse.json({
        ok: true,
        action,
        data: {
          count: listOrders().length,
          items: listOrders().slice(0, MAX_ORDERS_TO_SHOW)
        }
      });
    case "order": {
      const orderId = request.nextUrl.searchParams.get("id")?.trim();

      if (!orderId) {
        return NextResponse.json({ ok: false, error: "Missing order id." }, { status: 400 });
      }

      const order = getOrderById(orderId);

      if (!order) {
        return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
      }

      return NextResponse.json({ ok: true, action, data: order });
    }
    case "report":
      return NextResponse.json({
        ok: true,
        action,
        data: buildReportPayload(request.nextUrl.searchParams.get("date")?.trim() ?? undefined)
      });
    default:
      return NextResponse.json({ ok: false, error: "Unsupported action." }, { status: 400 });
  }
};

const handlePostAction = async (request: NextRequest) => {
  const body = (await request.json()) as {
    action?: string;
    pendingCheckoutId?: string;
  };
  const action = body.action?.trim().toLowerCase();

  switch (action) {
    case "confirm-pending":
    case "reject-pending": {
      if (!body.pendingCheckoutId?.trim()) {
        return NextResponse.json({ ok: false, error: "Missing pending checkout id." }, { status: 400 });
      }

      const result = processPendingCheckoutDecision({
        pendingCheckoutId: body.pendingCheckoutId.trim(),
        decision: action === "confirm-pending" ? "confirm" : "reject"
      });

      return NextResponse.json({
        ok: result.ok,
        action,
        data: result.ok
          ? {
              code: result.code,
              title: result.title,
              description: result.description,
              orderId: result.order?.id,
              pointsAwarded: result.pointsAwarded ?? 0
            }
          : {
              code: result.code,
              title: result.title,
              description: result.description
            }
      }, { status: result.status });
    }
    case "summary":
      return NextResponse.json({
        ok: true,
        action,
        data: {
          dashboard: buildDashboardPayload(),
          latestOrders: listOrders().slice(0, 10).map((order) => ({
            id: order.id,
            name: order.name,
            finalPrice: order.finalPrice ?? 0,
            profit: order.profit ?? 0,
            warrantyUntil: order.warrantyUntil,
            status: order.status
          })),
          pending: listPendingCheckouts().slice(0, 10).map((checkout) => ({
            id: checkout.id,
            orderCode: checkout.orderCode ?? checkout.id.slice(0, 8).toUpperCase(),
            productName: checkout.productName,
            customerLabel: checkout.customerLabel,
            finalPrice: checkout.finalPrice,
            expiresAt: checkout.expiresAt
          }))
        }
      });
    default:
      return NextResponse.json({ ok: false, error: "Unsupported action." }, { status: 400 });
  }
};

export async function GET(request: NextRequest) {
  if (!isAuthorizedOpenClawRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  return handleGetAction(request);
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedOpenClawRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  return handlePostAction(request);
}
