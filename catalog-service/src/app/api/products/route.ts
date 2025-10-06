import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { handleApiError, parsePagination, requireAdminAuth } from "@/lib/http";
import { productCreateSchema } from "@/schemas/product";

export const runtime = "nodejs";

/**
 * List products (search, status filter, pagination)
 * GET /api/products?page=1&pageSize=20&q=keyboard&status=active
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdminAuth(req, "products:read");
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const { page, pageSize } = parsePagination(searchParams);
    const q = searchParams.get("q")?.trim();
    const status = searchParams.get("status") ?? undefined;

    const filter: Record<string, unknown> = {};
    if (q && q.length > 0) filter.$or = [{ name: new RegExp(q, "i") }];
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      Product.countDocuments(filter),
    ]);

    return NextResponse.json({ items, page, pageSize, total });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * Create product
 * POST /api/products
 * body: { name, price, currency?, stockQty, status? }
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdminAuth(req, "products:write");
    await connectToDB();

    const payload = productCreateSchema.parse(await req.json());
    const doc = await Product.create(payload);

    return NextResponse.json(doc, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
