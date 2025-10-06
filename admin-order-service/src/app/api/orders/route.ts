import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Customer } from "@/models/Customer";
import { orderCreateSchema } from "@/schemas/order";
import { handleApiError, parsePagination, requireAdminAuth } from "@/lib/http";
import { lookupProducts } from "@/lib/catalog-client";

export const runtime = "nodejs";

function computeSubtotal(items: { priceSnapshot: number; qty: number }[]) {
  return items.reduce((acc, it) => acc + it.priceSnapshot * it.qty, 0);
}

function generateOrderNumber() {
  // sortable: YYYYMMDDhhmmss-RAND6
  const now = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${now}-${rand}`;
}

/**
 * List orders (optional filters), paginated
 * GET /api/orders?page=1&pageSize=20&status=created&customerId=<oid>
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdminAuth(req, "orders:read");
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const { page, pageSize } = parsePagination(searchParams);
    const status = searchParams.get("status") ?? undefined;
    const customerId = searchParams.get("customerId") ?? undefined;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (customerId) filter.customerId = customerId;

    const [items, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      Order.countDocuments(filter),
    ]);

    return NextResponse.json({ items, page, pageSize, total });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * Create order from explicit items [{productId, qty}]
 * POST /api/orders
 * body: { customerId, items }
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdminAuth(req, "orders:write");
    await connectToDB();

    const body = await req.json();
    const payload = orderCreateSchema.parse(body);

    // Guard: customer must exist
    const customer = await Customer.findById(payload.customerId);
    if (!customer) {
      return NextResponse.json({ error: "CustomerNotFound" }, { status: 404 });
    }

    const ids = (payload.items ?? []).map((i) => i.productId);
    if (ids.length === 0) {
      return NextResponse.json({ error: "EmptyItems" }, { status: 400 });
    }

    const devBypass = process.env.DEV_BYPASS_CATALOG === "1";

    // Build snapshots
    let currency = "USD";
    const snapshots = [];
    if (devBypass) {
      for (const it of payload.items!) {
        snapshots.push({
          // Mongoose casts string → ObjectId on save
          productId: it.productId,
          nameSnapshot: `DEV-PRODUCT-${it.productId.slice(-6)}`,
          priceSnapshot: 99.99,
          qty: it.qty,
        });
      }
    } else {
      const prods = await lookupProducts(ids);
      const prodMap = new Map(prods.map((p) => [p._id, p]));
      for (const it of payload.items!) {
        const p = prodMap.get(it.productId);
        if (!p || p.status !== "active" || p.stockQty < it.qty) {
          return NextResponse.json(
            { error: "Unavailable", details: { productId: it.productId } },
            { status: 400 }
          );
        }
        snapshots.push({
          productId: it.productId,
          nameSnapshot: p.name,
          priceSnapshot: p.price,
          qty: it.qty,
        });
        currency = p.currency ?? currency;
      }
    }

    const subtotal = computeSubtotal(snapshots);
    const orderNumber = generateOrderNumber();

    const doc = await Order.create({
      orderNumber,
      customerId: payload.customerId,
      items: snapshots,
      subtotal,
      currency,
      status: "created",
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
