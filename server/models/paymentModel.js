import mongoose from "mongoose";

const paymentSchema = mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
      alias: "dealer",
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      alias: "order",
    },
    amountPaid: {
      type: Number,
      required: [true, "Paid amount is required"],
      min: 0,
      alias: "amount",
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    remainingAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Bank Transfer"],
      default: "Cash",
    },
    transactionId: {
      type: String,
      trim: true,
      default: "",
    },
    paymentDate: {
      type: Date,
      default: Date.now,
      alias: "paidAt",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    note: {
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

paymentSchema.index({ dealerId: 1, paymentDate: -1 });
paymentSchema.index({ orderId: 1, paymentDate: -1 });
paymentSchema.index({ transactionId: 1 }, { sparse: true });

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
