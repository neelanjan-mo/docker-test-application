import { Schema, model, models, type Document, type Model } from "mongoose";

export interface ProductDoc extends Document {
  name: string;
  price: number;
  currency: string; // e.g., "USD"
  stockQty: number;
  status: "active" | "inactive";
  version: number; // optimistic concurrency
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<ProductDoc>(
  {
    name: { type: String, required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "USD" },
    stockQty: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
    version: { type: Number, required: true, default: 1 },
  },
  { timestamps: true }
);

export const Product: Model<ProductDoc> =
  (models.Product as Model<ProductDoc>) ??
  model<ProductDoc>("Product", ProductSchema);
