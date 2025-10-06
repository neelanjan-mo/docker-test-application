import { Schema, model, models } from "mongoose";

const CustomerSchema = new Schema(
  {
    email: { type: String, required: true, index: true },
    name: { type: String, required: true },
  },
  { timestamps: true }
);
export const Customer = models.Customer ?? model("Customer", CustomerSchema);
