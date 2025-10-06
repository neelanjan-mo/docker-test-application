import { z } from "zod";

export const productCreateSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
  currency: z.string().min(1).default("USD"),
  stockQty: z.number().int().nonnegative(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const productUpdateSchema = productCreateSchema.partial();

export const productListQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const productIdParam = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i),
});
