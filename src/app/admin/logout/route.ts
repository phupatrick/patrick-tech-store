import { NextResponse } from "next/server";

import { AUTH_SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const nextPath = String(formData.get("next") ?? "/");
  const response = NextResponse.redirect(new URL(nextPath.startsWith("/") ? nextPath : "/", request.url));
  response.cookies.set(AUTH_SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });

  return response;
}
