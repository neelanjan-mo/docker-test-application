import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db";
import { Cart } from "@/models/Cart";
import { cartCreateSchema } from "@/schemas/cart";
import { handleApiError, parsePagination, requireAdminAuth } from "@/lib/http";

export const runtime = "nodejs";

/**
 * List carts (optional by customerId), paginated
 * GET /api/carts?page=1&pageSize=20&customerId=<oid>
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdminAuth(req, "carts:read");
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const { page, pageSize } = parsePagination(searchParams);
    const customerId = searchParams.get("customerId") ?? undefined;

    const filter = customerId ? { customerId } : {};
    const [items, total] = await Promise.all([
      Cart.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      Cart.countDocuments(filter),
    ]);

    return NextResponse.json({ items, page, pageSize, total });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * Create cart for a customer (idempotent by customerId)
 * POST /api/carts
 * body: { customerId }
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdminAuth(req, "carts:write");
    await connectToDB();

    const payload = cartCreateSchema.parse(await req.json());

    const existing = await Cart.findOne({ customerId: payload.customerId });
    if (existing) return NextResponse.json(existing, { status: 200 });

    const doc = await Cart.create({ ...payload, items: [] });
    return NextResponse.json(doc, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
