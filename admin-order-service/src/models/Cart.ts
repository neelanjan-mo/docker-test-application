import {
  Schema,
  model,
  models,
  type Types,
  type Document,
  type Model,
} from "mongoose";

export type CartItem = {
  productId: Types.ObjectId;
  nameSnapshot: string;
  priceSnapshot: number;
  qty: number;
};

export interface CartDoc extends Document {
  customerId: Types.ObjectId;
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema<CartItem>(
  {
    productId: { type: Schema.Types.ObjectId, required: true },
    nameSnapshot: { type: String, required: true },
    priceSnapshot: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const CartSchema = new Schema<CartDoc>(
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

export const Cart: Model<CartDoc> =
  (models.Cart as Model<CartDoc>) ?? model<CartDoc>("Cart", CartSchema);
