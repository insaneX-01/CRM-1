import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

import Activity from "../models/activityModel.js";
import Dealer from "../models/dealerModel.js";
import Order from "../models/orderModel.js";
import Payment from "../models/paymentModel.js";
import { logActivity } from "../utils/activityLogger.js";
import { syncOrderPaymentSnapshot } from "../utils/orderPayment.js";
import {
  getAccessibleOrderIdsForUser,
  getDealerForUser,
} from "../utils/accessScope.js";

const normalizePaymentMethod = (value = "Cash") => {
  if (value === "Bank") return "Bank Transfer";
  return value;
};

const parseDateRange = ({ startDate, endDate }) => {
  if (!startDate && !endDate) return null;

  const start = startDate ? new Date(startDate) : new Date("2000-01-01");
  const end = endDate ? new Date(endDate) : new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid payment date range");
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { $gte: start, $lte: end };
};

const buildPaymentQuery = async (req) => {
  const { dealerId, orderId, startDate, endDate } = req.query;
  const query = {};

  if (req.user.role === "dealer") {
    const dealer = await getDealerForUser(req.user._id);
    if (!dealer) return { query: { _id: null }, dealer: null };
    query.dealerId = dealer._id;
  } else if (dealerId) {
    query.dealerId = dealerId;
  }

  if (orderId) query.orderId = orderId;

  if (req.user.role === "salesperson") {
    const orderIds = await getAccessibleOrderIdsForUser(req.user);
    query.orderId = orderId ? orderId : { $in: orderIds.length ? orderIds : [null] };

    if (orderId && !orderIds.some((id) => id.toString() === orderId.toString())) {
      return { query: { _id: null } };
    }
  }

  const paymentDate = parseDateRange({ startDate, endDate });
  if (paymentDate) query.paymentDate = paymentDate;

  return { query };
};

const populatePaymentQuery = (query) =>
  query
    .populate("dealerId", "name businessName area phone")
    .populate("orderId", "products totalAmount status paymentStatus createdAt");

const buildLedgerSummary = async (dealerId) => {
  const dealerObjectId = new mongoose.Types.ObjectId(dealerId);

  const [orderStats, paymentStats, paymentHistory] = await Promise.all([
    Order.aggregate([
      { $match: { dealerId: dealerObjectId } },
      {
        $group: {
          _id: "$dealerId",
          totalOrdersAmount: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 },
        },
      },
    ]),
    Payment.aggregate([
      { $match: { dealerId: dealerObjectId } },
      {
        $group: {
          _id: "$dealerId",
          totalPaid: { $sum: "$amountPaid" },
        },
      },
    ]),
    populatePaymentQuery(
      Payment.find({ dealerId: dealerObjectId }).sort({ paymentDate: -1 }).limit(50)
    ),
  ]);

  const totalOrdersAmount = orderStats[0]?.totalOrdersAmount || 0;
  const totalPaid = paymentStats[0]?.totalPaid || 0;

  return {
    totalOrdersAmount,
    totalPaid,
    totalOutstanding: Math.max(totalOrdersAmount - totalPaid, 0),
    paymentHistory,
    orderCount: orderStats[0]?.orderCount || 0,
  };
};

// @desc    Create payment
// @route   POST /api/payments
// @access  Private
export const createPayment = asyncHandler(async (req, res) => {
  const {
    dealerId,
    orderId,
    amountPaid,
    amount,
    paymentMethod = "Cash",
    transactionId = "",
    paymentDate,
    note = "",
  } = req.body;

  const resolvedAmount = Number(amountPaid ?? amount);
  if (!orderId || !resolvedAmount || resolvedAmount <= 0) {
    res.status(400);
    throw new Error("Order and paid amount are required");
  }

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  let dealer = await Dealer.findById(dealerId || order.dealerId);
  if (!dealer || dealer._id.toString() !== order.dealerId.toString()) {
    res.status(400);
    throw new Error("Dealer does not match the order");
  }

  if (req.user.role === "salesperson") {
    const orderIds = await getAccessibleOrderIdsForUser(req.user);
    if (!orderIds.some((id) => id.toString() === order._id.toString())) {
      res.status(403);
      throw new Error("You can only record payments for orders within your scope");
    }
  }

  if (req.user.role === "dealer") {
    const dealerUser = await getDealerForUser(req.user._id);
    if (!dealerUser || dealerUser._id.toString() !== dealer._id.toString()) {
      res.status(403);
      throw new Error("Forbidden");
    }
  }

  const existingPayments = await Payment.find({ orderId: order._id });
  const alreadyPaid = existingPayments.reduce((sum, payment) => sum + payment.amountPaid, 0);
  const remainingBefore = Math.max(order.totalAmount - alreadyPaid, 0);

  if (resolvedAmount > remainingBefore) {
    res.status(400);
    throw new Error("Payment amount exceeds the outstanding order amount");
  }

  if (paymentDate) {
    const parsedPaymentDate = new Date(paymentDate);
    if (Number.isNaN(parsedPaymentDate.getTime())) {
      res.status(400);
      throw new Error("Invalid payment date");
    }
  }

  const payment = await Payment.create({
    dealerId: dealer._id,
    orderId: order._id,
    amountPaid: resolvedAmount,
    totalAmount: order.totalAmount,
    remainingAmount: Math.max(remainingBefore - resolvedAmount, 0),
    paymentMethod: normalizePaymentMethod(paymentMethod),
    transactionId: transactionId.trim(),
    paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
    createdBy: req.user._id,
    note: note.trim(),
  });

  const snapshot = await syncOrderPaymentSnapshot(order._id);

  await Promise.all([
    logActivity({
      type: "payment",
      entityType: "order",
      entityId: order._id,
      message: `Payment of ${resolvedAmount} added to order`,
      user: req.user._id,
      metadata: {
        paymentId: payment._id,
        dealerId: dealer._id,
        remainingAmount: snapshot?.remainingAmount ?? payment.remainingAmount,
        paymentStatus: snapshot?.paymentStatus ?? order.paymentStatus,
      },
    }),
    logActivity({
      type: "payment",
      entityType: "dealer",
      entityId: dealer._id,
      message: "Ledger updated after payment entry",
      user: req.user._id,
      metadata: {
        paymentId: payment._id,
        orderId: order._id,
      },
    }),
  ]);

  const populatedPayment = await populatePaymentQuery(Payment.findById(payment._id));
  res.status(201).json(populatedPayment);
});

// @desc    Get payments
// @route   GET /api/payments
// @access  Private
export const getPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const { query } = await buildPaymentQuery(req);
  const orderAggregateMatch = {};

  if (query.dealerId) {
    orderAggregateMatch.dealerId = new mongoose.Types.ObjectId(query.dealerId.toString());
  }

  if (req.user.role === "salesperson") {
    const orderIds = await getAccessibleOrderIdsForUser(req.user);
    orderAggregateMatch._id = { $in: orderIds.length ? orderIds : [null] };
  }

  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (safePage - 1) * safeLimit;

  const [total, payments, paymentSummaryRows, orderSummaryRows] = await Promise.all([
    Payment.countDocuments(query),
    populatePaymentQuery(
      Payment.find(query).sort({ paymentDate: -1, createdAt: -1 }).skip(skip).limit(safeLimit)
    ),
    Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$dealerId",
          totalPaid: { $sum: "$amountPaid" },
        },
      },
      {
        $lookup: {
          from: "dealers",
          localField: "_id",
          foreignField: "_id",
          as: "dealer",
        },
      },
      { $unwind: { path: "$dealer", preserveNullAndEmptyArrays: true } },
      { $sort: { totalPaid: -1 } },
    ]),
    Order.aggregate([
      ...(Object.keys(orderAggregateMatch).length ? [{ $match: orderAggregateMatch }] : []),
      {
        $group: {
          _id: "$dealerId",
          totalOrdersAmount: { $sum: "$totalAmount" },
        },
      },
    ]),
  ]);

  const orderSummaryMap = new Map(orderSummaryRows.map((row) => [row._id?.toString(), row.totalOrdersAmount]));
  const dealerBreakdown = paymentSummaryRows.map((row) => {
    const totalOrdersAmount = orderSummaryMap.get(row._id?.toString()) || 0;
    return {
      dealerId: row._id,
      dealerName: row.dealer?.name || "Dealer",
      area: row.dealer?.area || "-",
      totalPaid: row.totalPaid,
      totalOrdersAmount,
      totalOutstanding: Math.max(totalOrdersAmount - row.totalPaid, 0),
    };
  });

  const summary = {
    totalPayments: total,
    totalPaid: dealerBreakdown.reduce((sum, item) => sum + item.totalPaid, 0),
    totalOrdersAmount: dealerBreakdown.reduce((sum, item) => sum + item.totalOrdersAmount, 0),
    totalOutstanding: dealerBreakdown.reduce((sum, item) => sum + item.totalOutstanding, 0),
    dealerBreakdown,
  };

  res.json({
    payments,
    total,
    page: safePage,
    pages: Math.ceil(total / safeLimit) || 1,
    summary,
  });
});

// @desc    Get payment by id
// @route   GET /api/payments/:id
// @access  Private
export const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await populatePaymentQuery(Payment.findById(req.params.id));

  if (!payment) {
    res.status(404);
    throw new Error("Payment not found");
  }

  if (req.user.role === "dealer") {
    const dealer = await getDealerForUser(req.user._id);
    if (!dealer || payment.dealerId?._id.toString() !== dealer._id.toString()) {
      res.status(403);
      throw new Error("Forbidden");
    }
  }

  if (req.user.role === "salesperson") {
    const orderIds = await getAccessibleOrderIdsForUser(req.user);
    if (!orderIds.some((id) => id.toString() === payment.orderId?._id.toString())) {
      res.status(403);
      throw new Error("Forbidden");
    }
  }

  res.json(payment);
});

// @desc    Get ledger for a dealer
// @route   GET /api/payments/ledger/:dealerId
// @access  Private
export const getDealerLedger = asyncHandler(async (req, res) => {
  const dealer = await Dealer.findById(req.params.dealerId);
  if (!dealer) {
    res.status(404);
    throw new Error("Dealer not found");
  }

  if (req.user.role === "dealer") {
    const dealerUser = await getDealerForUser(req.user._id);
    if (!dealerUser || dealerUser._id.toString() !== dealer._id.toString()) {
      res.status(403);
      throw new Error("Forbidden");
    }
  }

  if (req.user.role === "salesperson") {
    const orderIds = await getAccessibleOrderIdsForUser(req.user);
    const hasDealerAccess = await Order.exists({
      _id: { $in: orderIds },
      dealerId: dealer._id,
    });

    if (!hasDealerAccess) {
      res.status(403);
      throw new Error("Forbidden");
    }
  }

  const ledger = await buildLedgerSummary(dealer._id);
  const timeline = await Activity.find({
    type: "payment",
    $or: [
      { entityType: "dealer", entityId: dealer._id },
      { "metadata.dealerId": dealer._id },
    ],
  })
    .populate("userId", "name email role")
    .sort({ createdAt: -1 })
    .limit(20);

  res.json({
    dealer,
    ...ledger,
    timeline,
  });
});
