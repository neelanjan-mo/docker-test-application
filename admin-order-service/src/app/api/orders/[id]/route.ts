import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { orderIdParam, orderStatusUpdateSchema } from "@/schemas/order";
import { handleApiError, requireAdminAuth } from "@/lib/http";

export const runtime = "nodejs";

// Keep a local type that matches your Zod enum
type OrderStatus = "created" | "confirmed" | "fulfilled" | "cancelled";

/**
 * Read order by id
 * GET /api/orders/:id
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth(_req, "orders:read");
    await connectToDB();

    const { id } = orderIdParam.parse(await params);
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
 * body: { status }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth(req, "orders:write");
    await connectToDB();

    const { id } = orderIdParam.parse(await params);
    const parsed = orderStatusUpdateSchema.parse(await req.json());
    const nextStatus: OrderStatus = parsed.status;

    const current = await Order.findById(id);
    if (!current)
      return NextResponse.json({ error: "NotFound" }, { status: 404 });

    const allowed: Record<OrderStatus, OrderStatus[]> = {
      created: ["confirmed", "cancelled"],
      confirmed: ["fulfilled", "cancelled"],
      fulfilled: [],
      cancelled: [],
    };
    const nextAllowed = allowed[current.status as OrderStatus] ?? [];
    if (
      !nextAllowed.includes(nextStatus) &&
      nextStatus !== (current.status as OrderStatus)
    ) {
      return NextResponse.json(
        {
          error: "InvalidTransition",
          details: { from: current.status, to: nextStatus },
        },
        { status: 400 }
      );
    }

    current.status = nextStatus;
    await current.save();

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth(req, "orders:write");
    await connectToDB();

    const { id } = orderIdParam.parse(await params);
    const doc = await Order.findByIdAndDelete(id);
    if (!doc) return NextResponse.json({ error: "NotFound" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
