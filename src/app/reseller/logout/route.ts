import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/reseller", request.url));
  response.cookies.set("reseller_user", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(0)
  });
  return response;
}
