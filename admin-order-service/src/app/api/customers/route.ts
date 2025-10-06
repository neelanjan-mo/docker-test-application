import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { customerCreateSchema } from "@/schemas/customer";
import { handleApiError, parsePagination, requireAdminAuth } from "@/lib/http";

export const runtime = "nodejs";

/**
 * List customers (search + pagination)
 * GET /api/customers?page=1&pageSize=20&q=alice
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdminAuth(req, "customers:read");
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const { page, pageSize } = parsePagination(searchParams);
    const q = searchParams.get("q")?.trim();

    const filter =
      q && q.length > 0
        ? { $or: [{ email: new RegExp(q, "i") }, { name: new RegExp(q, "i") }] }
        : {};

    const [items, total] = await Promise.all([
      Customer.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      Customer.countDocuments(filter),
    ]);

    return NextResponse.json({ items, page, pageSize, total });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * Create customer
 * POST /api/customers
 * body: { email, name }
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdminAuth(req, "customers:write");
    await connectToDB();

    const body = await req.json();
    const payload = customerCreateSchema.parse(body);

    const doc = await Customer.create(payload);
    return NextResponse.json(doc, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
