import { Schema, model, models } from "mongoose";

const OrderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, required: true },
    nameSnapshot: { type: String, required: true },
    priceSnapshot: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    items: {
      type: [OrderItemSchema],
      validate: (v: unknown[]) => (v?.length ?? 0) > 0,
    },
    subtotal: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "USD" },
    status: {
      type: String,
      enum: ["created", "confirmed", "fulfilled", "cancelled"],
      default: "created",
      index: true,
    },
  },
  { timestamps: true }
);
export const Order = models.Order ?? model("Order", OrderSchema);
