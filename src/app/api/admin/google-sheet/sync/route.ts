import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import { NextRequest, NextResponse } from "next/server";

const execFileAsync = promisify(execFile);

const GOOGLE_SHEET_SYNC_SECRET = process.env.GOOGLE_SHEET_SYNC_SECRET?.trim();
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID?.trim();

const isAuthorized = (request: NextRequest) => {
  if (!GOOGLE_SHEET_SYNC_SECRET) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  const secretHeader = request.headers.get("x-google-sheet-secret");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;

  return bearerToken === GOOGLE_SHEET_SYNC_SECRET || secretHeader === GOOGLE_SHEET_SYNC_SECRET;
};

const resolveSpreadsheetId = async (request: NextRequest) => {
  const queryId = request.nextUrl.searchParams.get("spreadsheetId")?.trim();

  if (queryId) {
    return queryId;
  }

  try {
    const body = (await request.json()) as { spreadsheetId?: string } | null;
    const bodyId = body?.spreadsheetId?.trim();
    return bodyId || GOOGLE_SHEET_ID;
  } catch {
    return GOOGLE_SHEET_ID;
  }
};

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!GOOGLE_SHEET_SYNC_SECRET) {
    return NextResponse.json({ error: "GOOGLE_SHEET_SYNC_SECRET is not configured." }, { status: 503 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const spreadsheetId = await resolveSpreadsheetId(request);

  if (!spreadsheetId) {
    return NextResponse.json({ error: "Missing spreadsheet ID." }, { status: 400 });
  }

  const scriptPath = path.join(process.cwd(), "scripts", "sync-google-sheet-products.mjs");

  try {
    const { stdout, stderr } = await execFileAsync("node", [scriptPath, spreadsheetId], {
      cwd: process.cwd(),
      env: process.env
    });

    return NextResponse.json({
      ok: true,
      spreadsheetId,
      output: stdout.trim(),
      errorOutput: stderr.trim() || undefined
    });
  } catch (error) {
    const executionError = error as Error & {
      stdout?: string;
      stderr?: string;
      code?: number | string;
    };

    return NextResponse.json(
      {
        ok: false,
        spreadsheetId,
        error: executionError.message,
        output: executionError.stdout?.trim() || undefined,
        errorOutput: executionError.stderr?.trim() || undefined,
        exitCode: executionError.code ?? undefined
      },
      { status: 500 }
    );
  }
}
