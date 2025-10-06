import { z } from "zod";
import { objectIdStr } from "@/lib/zod-helpers";

export const customerCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});
export const customerUpdateSchema = customerCreateSchema.partial();
export const customerIdParam = z.object({ id: objectIdStr });
