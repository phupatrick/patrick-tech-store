import { NextRequest, NextResponse } from "next/server";

import {
  getInvalidCheckoutDecisionResult,
  processPendingCheckoutDecision,
  validateCheckoutDecision
} from "@/lib/checkout-processing";

const renderHtml = (title: string, description: string) =>
  `<!doctype html>
  <html lang="vi">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${title}</title>
      <style>
        body { font-family: Segoe UI, sans-serif; background: #020617; color: #e2e8f0; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 24px; }
        .card { max-width: 560px; padding: 28px; border-radius: 20px; border: 1px solid rgba(148,163,184,.25); background: rgba(15,23,42,.9); }
        h1 { margin: 0 0 12px; font-size: 28px; }
        p { margin: 0; line-height: 1.6; color: #cbd5e1; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>${title}</h1>
        <p>${description}</p>
      </div>
    </body>
  </html>`;

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();
  const decision = request.nextUrl.searchParams.get("decision")?.trim();

  if (!token || !validateCheckoutDecision(decision)) {
    const result = getInvalidCheckoutDecisionResult();
    return new NextResponse(renderHtml(result.title, result.description), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
      status: result.status
    });
  }

  const result = processPendingCheckoutDecision({ token, decision });

  return new NextResponse(
    renderHtml(result.title, result.description),
    {
      headers: { "Content-Type": "text/html; charset=utf-8" },
      status: result.status
    }
  );
}
