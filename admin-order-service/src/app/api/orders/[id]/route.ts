import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { orderIdParam, orderStatusUpdateSchema } from "@/schemas/order";
import { handleApiError, requireAdminAuth } from "@/lib/http";

export const runtime = "nodejs";

/**
 * Read order by id
 * GET /api/orders/:id
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdminAuth(req, "orders:read");
    await connectToDB();

    const { id } = orderIdParam.parse(params);
    const doc = await Order.findById(id);
    if (!doc) return NextResponse.json({ error: "NotFound" }, { status: 404 });

    return NextResponse.json(doc);
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * Update order status
 * PATCH /api/orders/:id
 * body: { status: 'created' | 'confirmed' | 'fulfilled' | 'cancelled' }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdminAuth(req, "orders:write");
    await connectToDB();

    const { id } = orderIdParam.parse(params);
    const { status } = orderStatusUpdateSchema.parse(await req.json());

    // Optional: enforce simple transition policy
    // created -> confirmed -> fulfilled/cancelled
    const current = await Order.findById(id);
    if (!current)
      return NextResponse.json({ error: "NotFound" }, { status: 404 });

    const allowed: Record<string, string[]> = {
      created: ["confirmed", "cancelled"],
      confirmed: ["fulfilled", "cancelled"],
      fulfilled: [],
      cancelled: [],
    };
    const nextAllowed = allowed[current.status] ?? [];
    if (!nextAllowed.includes(status) && status !== current.status) {
      return NextResponse.json(
        {
          error: "InvalidTransition",
          details: { from: current.status, to: status },
        },
        { status: 400 }
      );
    }

    current.status = status as any;
    await current.save();

    // Hook point: on confirmed, call inventory decrement in Catalog
    // (intentionally omitted here; wire in when Catalog internal API is ready)

    return NextResponse.json(current);
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * Delete order by id
 * DELETE /api/orders/:id
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdminAuth(req, "orders:write");
    await connectToDB();

    const { id } = orderIdParam.parse(params);
    const doc = await Order.findByIdAndDelete(id);
    if (!doc) return NextResponse.json({ error: "NotFound" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
