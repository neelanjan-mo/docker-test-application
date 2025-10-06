import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db";
import { Cart, type CartItem } from "@/models/Cart";
import { cartIdParam, cartItemUpsertSchema } from "@/schemas/cart";
import { handleApiError, requireAdminAuth } from "@/lib/http";
import { lookupProducts } from "@/lib/catalog-client";

export const runtime = "nodejs";

/**
 * Read a cart by id
 * GET /api/carts/:id
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdminAuth(req, "carts:read");
    await connectToDB();

    const { id } = cartIdParam.parse(params);
    const doc = await Cart.findById(id);
    if (!doc) return NextResponse.json({ error: "NotFound" }, { status: 404 });

    return NextResponse.json(doc);
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * Upsert a single cart line item (validates via Catalog; supports qty=0 removal)
 * PUT /api/carts/:id
 * body: { productId, qty }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdminAuth(req, "carts:write");
    await connectToDB();

    const { id } = cartIdParam.parse(params);
    const { productId, qty } = cartItemUpsertSchema.parse(await req.json());

    const cart = await Cart.findById(id);
    if (!cart) return NextResponse.json({ error: "NotFound" }, { status: 404 });

    const items = cart.items as unknown as CartItem[];
    const idx = items.findIndex(
      (i: CartItem) => i.productId.toString() === productId
    );

    // qty === 0 → remove line if present (idempotent)
    if (qty === 0) {
      if (idx >= 0) {
        items.splice(idx, 1);
        await cart.save();
      }
      return NextResponse.json(cart);
    }

    // Validate / snapshot product
    const devBypass = process.env.DEV_BYPASS_CATALOG === "1";
    let nameSnapshot: string;
    let priceSnapshot: number;

    if (devBypass) {
      // local-only fallback when Catalog is not available
      nameSnapshot = `DEV-PRODUCT-${productId.slice(-6)}`;
      priceSnapshot = 99.99;
    } else {
      const [prod] = await lookupProducts([productId]);
      if (!prod || prod.status !== "active" || prod.stockQty < qty) {
        return NextResponse.json({ error: "Unavailable" }, { status: 400 });
      }
      nameSnapshot = prod.name;
      priceSnapshot = prod.price;
    }

    const snapshot: CartItem = {
      // Mongoose will cast string → ObjectId on save
      // @ts-expect-error cast on save
      productId,
      nameSnapshot,
      priceSnapshot,
      qty,
    };

    if (idx >= 0) {
      items[idx] = snapshot;
    } else {
      items.push(snapshot);
    }

    await cart.save();
    return NextResponse.json(cart);
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * Delete a cart by id
 * DELETE /api/carts/:id
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdminAuth(req, "carts:write");
    await connectToDB();

    const { id } = cartIdParam.parse(params);
    const doc = await Cart.findByIdAndDelete(id);
    if (!doc) return NextResponse.json({ error: "NotFound" }, { status: 404 });

    // 204 could be used; returning body aligns with your other handlers
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
