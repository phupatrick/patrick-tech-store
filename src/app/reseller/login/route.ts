import { NextRequest, NextResponse } from "next/server";

import { users } from "@/lib/data";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const userId = formData.get("userId");
  const reseller = users.find((user) => user.id === userId && user.role === "reseller");
  const redirectUrl = new URL("/reseller", request.url);
  const response = NextResponse.redirect(redirectUrl);

  if (reseller) {
    response.cookies.set("reseller_user", reseller.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/"
    });
  }

  return response;
}
