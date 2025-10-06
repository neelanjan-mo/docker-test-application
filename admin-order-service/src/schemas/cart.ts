import { z } from "zod";
import { objectIdStr } from "@/lib/zod-helpers";

export const cartCreateSchema = z.object({ customerId: objectIdStr });
export const cartItemUpsertSchema = z.object({
  productId: objectIdStr,
  qty: z.number().int().positive(),
});
export const cartIdParam = z.object({ id: objectIdStr });
