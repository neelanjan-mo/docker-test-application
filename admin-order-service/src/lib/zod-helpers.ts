import { z } from "zod";
export const objectIdStr = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");
export const paginationQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  q: z.string().optional(),
});
