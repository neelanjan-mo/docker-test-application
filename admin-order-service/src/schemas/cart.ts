import { z } from "zod";
import { objectIdStr } from "@/lib/zod-helpers";

/** Create (idempotent by customerId) */
export const cartCreateSchema = z.object({
  customerId: objectIdStr,
});

/**
 * Upsert a single line item.
 * qty = 0 → remove the item (route implements the delete semantics).
 */
export const cartItemUpsertSchema = z.object({
  productId: objectIdStr,
  qty: z.number().int().nonnegative().max(9999),
});

/** Path param */
export const cartIdParam = z.object({ id: objectIdStr });

/** Optional: query params for GET /api/carts */
export const cartListQuerySchema = z.object({
  customerId: objectIdStr.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
