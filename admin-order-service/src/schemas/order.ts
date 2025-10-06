import { z } from "zod";
import { objectIdStr } from "@/lib/zod-helpers";

export const orderCreateSchema = z.object({
  customerId: objectIdStr,
  items: z
    .array(
      z.object({ productId: objectIdStr, qty: z.number().int().positive() })
    )
    .min(1)
    .optional(),
});
export const orderStatusUpdateSchema = z.object({
  status: z.enum(["created", "confirmed", "fulfilled", "cancelled"]),
});
export const orderIdParam = z.object({ id: objectIdStr });
