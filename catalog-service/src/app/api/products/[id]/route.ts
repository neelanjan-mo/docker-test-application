import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { handleApiError, requireAdminAuth } from "@/lib/http";
import { productIdParam, productUpdateSchema } from "@/schemas/product";

export const runtime = "nodejs";

/**
 * Read product
 * GET /api/products/:id
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth(req, "products:read");
    await connectToDB();

    const { id } = productIdParam.parse(await params);
    const doc = await Product.findById(id);
    if (!doc) return NextResponse.json({ error: "NotFound" }, { status: 404 });

    return NextResponse.json(doc);
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * Partial update (bumps optimistic version)
 * PATCH /api/products/:id
 * body: { name?, price?, currency?, stockQty?, status? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth(req, "products:write");
    await connectToDB();

    const { id } = productIdParam.parse(await params);
    const updateBody = productUpdateSchema.parse(await req.json());

    if (Object.keys(updateBody).length === 0) {
      return NextResponse.json({ error: "EmptyUpdate" }, { status: 400 });
    }

    const doc = await Product.findByIdAndUpdate(
      id,
      { $set: updateBody, $inc: { version: 1 } },
      { new: true }
    );

    if (!doc) return NextResponse.json({ error: "NotFound" }, { status: 404 });
    return NextResponse.json(doc);
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * Delete product
 * DELETE /api/products/:id
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth(req, "products:write");
    await connectToDB();

    const { id } = productIdParam.parse(await params);
    const doc = await Product.findByIdAndDelete(id);
    if (!doc) return NextResponse.json({ error: "NotFound" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
