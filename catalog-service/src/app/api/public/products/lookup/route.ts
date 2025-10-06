import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { handleApiError } from "@/lib/http";
import { productLookupSchema } from "@/schemas/public";
import { requireS2SKey } from "@/lib/s2s";

export const runtime = "nodejs";

/**
 * POST /api/public/products/lookup
 * headers: Authorization: Bearer <PUBLIC_S2S_KEY>
 * body: { ids: string[] }  // 24-hex ObjectIds
 *
 * Returns minimal, order-service-safe fields.
 */
export async function POST(req: NextRequest) {
  try {
    requireS2SKey(req);
    await connectToDB();

    const payload = productLookupSchema.parse(await req.json());

    const items = await Product.find(
      { _id: { $in: payload.ids } },
      { name: 1, price: 1, currency: 1, stockQty: 1, status: 1 }
    ).lean();

    return NextResponse.json(items);
  } catch (e) {
    return handleApiError(e);
  }
}
