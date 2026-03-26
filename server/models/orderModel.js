import mongoose from "mongoose";

const orderProductSchema = mongoose.Schema(
  {
    productName: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: 1,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
    },
  },
  { _id: false }
);

const orderSchema = mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      alias: "lead",
    },
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
      alias: "dealer",
    },
    products: {
      type: [orderProductSchema],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: "At least one product is required",
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Delivered", "Cancelled"],
      default: "Pending",
    },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Partial", "Pending"],
      default: "Pending",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

orderSchema.index({ dealerId: 1, status: 1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });
orderSchema.index({ leadId: 1 }, { unique: true });

orderSchema.pre("validate", function () {
  this.totalAmount = this.products.reduce((sum, item) => sum + item.quantity * item.price, 0);
});

const Order = mongoose.model("Order", orderSchema);

export default Order;
