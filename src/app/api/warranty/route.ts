import { NextRequest, NextResponse } from "next/server";

import { listOrders } from "@/lib/order-store";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim().toLowerCase() || "";
  const orders = listOrders();

  const results = orders.filter((order) => {
    if (!query) {
      return false;
    }

    return [order.id, order.warrantyCode ?? "", order.phone ?? "", order.name, order.content].some((value) =>
      value.toLowerCase().includes(query)
    );
  });

  return NextResponse.json({
    results
  });
}
