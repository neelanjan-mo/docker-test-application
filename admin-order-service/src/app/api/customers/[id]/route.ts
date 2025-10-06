import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db";
import { Cart, type CartItem } from "@/models/Cart";
import { cartIdParam, cartItemUpsertSchema } from "@/schemas/cart";
import { handleApiError, requireAdminAuth } from "@/lib/http";
import { lookupProducts } from "@/lib/catalog-client";

export const runtime = "nodejs";

/** GET /api/carts/:id */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth(req, "carts:read");
    await connectToDB();

    const { id } = cartIdParam.parse(await params);
    const doc = await Cart.findById(id);
    if (!doc) return NextResponse.json({ error: "NotFound" }, { status: 404 });
    return NextResponse.json(doc);
  } catch (e) {
    return handleApiError(e);
  }
}

/** PUT /api/carts/:id  body: { productId, qty } */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth(req, "carts:write");
    await connectToDB();

    const { id } = cartIdParam.parse(await params);
    const { productId, qty } = cartItemUpsertSchema.parse(await req.json());

    const cart = await Cart.findById(id);
    if (!cart) return NextResponse.json({ error: "NotFound" }, { status: 404 });

    const items = cart.items as unknown as CartItem[];
    const idx = items.findIndex((i) => i.productId.toString() === productId);

    if (qty === 0) {
      if (idx >= 0) {
        items.splice(idx, 1);
        await cart.save();
      }
      return NextResponse.json(cart);
    }

    const devBypass = process.env.DEV_BYPASS_CATALOG === "1";
    let nameSnapshot: string;
    let priceSnapshot: number;

    if (devBypass) {
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
      // @ts-expect-error mongoose casts on save
      productId,
      nameSnapshot,
      priceSnapshot,
      qty,
    };

    if (idx >= 0) items[idx] = snapshot;
    else items.push(snapshot);

    await cart.save();
    return NextResponse.json(cart);
  } catch (e) {
    return handleApiError(e);
  }
}

/** DELETE /api/carts/:id */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth(req, "carts:write");
    await connectToDB();

    const { id } = cartIdParam.parse(await params);
    const doc = await Cart.findByIdAndDelete(id);
    if (!doc) return NextResponse.json({ error: "NotFound" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
