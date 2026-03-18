import { NextRequest, NextResponse } from "next/server";

import { buildDailySalesReport, getTodayReportDate } from "@/lib/daily-report";
import { sendDailySalesReportToTelegram } from "@/lib/telegram";

const REPORT_SECRET = process.env.REPORT_CRON_SECRET;

const isValidDate = (value?: string | null) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));

const isAuthorized = (request: NextRequest) => {
  if (!REPORT_SECRET) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  const secretHeader = request.headers.get("x-report-secret");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;

  return bearerToken === REPORT_SECRET || secretHeader === REPORT_SECRET;
};

const resolveDate = async (request: NextRequest) => {
  const queryDate = request.nextUrl.searchParams.get("date");

  if (isValidDate(queryDate)) {
    return queryDate as string;
  }

  if (request.method === "POST") {
    try {
      const body = (await request.json()) as { date?: string };

      if (isValidDate(body.date)) {
        return body.date as string;
      }
    } catch {
      return getTodayReportDate();
    }
  }

  return getTodayReportDate();
};

const handleReportRequest = async (request: NextRequest) => {
  if (!REPORT_SECRET) {
    return NextResponse.json({ error: "REPORT_CRON_SECRET is not configured." }, { status: 503 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const date = await resolveDate(request);
  const report = buildDailySalesReport(date);
  const telegram = await sendDailySalesReportToTelegram(report);

  return NextResponse.json({
    ok: telegram.ok,
    date,
    report,
    telegram
  });
};

export const GET = handleReportRequest;
export const POST = handleReportRequest;
