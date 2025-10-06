import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { customerIdParam, customerUpdateSchema } from "@/schemas/customer";
import { handleApiError, requireAdminAuth } from "@/lib/http";

export const runtime = "nodejs";

/**
 * Read single customer
 * GET /api/customers/:id
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdminAuth(req, "customers:read");
    await connectToDB();

    const { id } = customerIdParam.parse(params);
    const doc = await Customer.findById(id);
    if (!doc) return NextResponse.json({ error: "NotFound" }, { status: 404 });

    return NextResponse.json(doc);
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * Partial update
 * PATCH /api/customers/:id
 * body: { email?, name? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdminAuth(req, "customers:write");
    await connectToDB();

    const { id } = customerIdParam.parse(params);
    const update = customerUpdateSchema.parse(await req.json());

    const doc = await Customer.findByIdAndUpdate(id, update, { new: true });
    if (!doc) return NextResponse.json({ error: "NotFound" }, { status: 404 });

    return NextResponse.json(doc);
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * Delete customer
 * DELETE /api/customers/:id
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdminAuth(req, "customers:write");
    await connectToDB();

    const { id } = customerIdParam.parse(params);
    await Customer.findByIdAndDelete(id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
