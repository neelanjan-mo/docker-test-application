import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { inventoryDecrementSchema } from "@/schemas/public";
import { handleApiError, makeHttpError } from "@/lib/http";
import { requireS2SKey } from "@/lib/s2s";

export const runtime = "nodejs";

/**
 * Atomic stock decrement across all lines.
 * If any line cannot be fulfilled, no stock is changed.
 * Requires MongoDB replica set for transactions.
 */
export async function POST(req: NextRequest) {
  let session: mongoose.ClientSession | null = null;
  try {
    requireS2SKey(req);
    await connectToDB();

    const { lines } = inventoryDecrementSchema.parse(await req.json());
    session = await mongoose.startSession();

    let results: Array<{ productId: string; stockQty: number }> = [];

    await session.withTransaction(async () => {
      const local: Array<{ productId: string; stockQty: number }> = [];

      for (const { productId, qty } of lines) {
        const doc = await Product.findOneAndUpdate(
          { _id: productId, stockQty: { $gte: qty } },
          { $inc: { stockQty: -qty, version: 1 } },
          { new: true, session }
        );

        if (!doc) {
          // abort the transaction (handled by withTransaction)
          throw makeHttpError(409, "StockNotAvailable", { productId });
        }

        local.push({ productId, stockQty: doc.stockQty });
      }

      results = local;
    });

    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return handleApiError(e);
  } finally {
    if (session) session.endSession();
  }
}
