import { z } from "zod";

export const productLookupSchema = z.object({
  ids: z.array(z.string().regex(/^[a-f\d]{24}$/i)).min(1),
});

export const inventoryDecrementSchema = z.object({
  lines: z
    .array(
      z.object({
        productId: z.string().regex(/^[a-f\d]{24}$/i),
        qty: z.number().int().positive(),
      })
    )
    .min(1),
  // optional optimistic concurrency
  version: z.number().int().positive().optional(),
});
