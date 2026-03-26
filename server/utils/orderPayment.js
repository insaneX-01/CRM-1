import mongoose from "mongoose";
import Order from "../models/orderModel.js";
import Payment from "../models/paymentModel.js";

export const derivePaymentStatus = (totalAmount, paidAmount) => {
  if (paidAmount <= 0) return "Pending";
  if (paidAmount >= totalAmount) return "Paid";
  return "Partial";
};

export const syncOrderPaymentSnapshot = async (orderId) => {
  const normalizedOrderId =
    typeof orderId === "string" ? new mongoose.Types.ObjectId(orderId) : orderId;
  const [order, aggregate] = await Promise.all([
    Order.findById(orderId),
    Payment.aggregate([
      { $match: { orderId: normalizedOrderId } },
      {
        $group: {
          _id: "$orderId",
          paidAmount: { $sum: "$amountPaid" },
        },
      },
    ]),
  ]);

  if (!order) return null;

  const paidAmount = aggregate[0]?.paidAmount || 0;
  const remainingAmount = Math.max(order.totalAmount - paidAmount, 0);
  const paymentStatus = derivePaymentStatus(order.totalAmount, paidAmount);

  order.paymentStatus = paymentStatus;
  await order.save();

  await Payment.updateMany(
    { orderId: order._id },
    { $set: { remainingAmount } }
  );

  return {
    order,
    paidAmount,
    remainingAmount,
    paymentStatus,
  };
};
