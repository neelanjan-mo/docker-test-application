import { Schema, model, models } from "mongoose";

const CartItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, required: true },
    nameSnapshot: { type: String, required: true },
    priceSnapshot: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const CartSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    items: { type: [CartItemSchema], default: [] },
  },
  { timestamps: true }
);
export const Cart = models.Cart ?? model("Cart", CartSchema);
