import asyncHandler from "express-async-handler";

import Activity from "../models/activityModel.js";
import Dealer from "../models/dealerModel.js";
import Lead from "../models/leadModel.js";
import Order from "../models/orderModel.js";
import Payment from "../models/paymentModel.js";
import { logActivity } from "../utils/activityLogger.js";
import { syncOrderPaymentSnapshot } from "../utils/orderPayment.js";
import { getDealerForUser, getOrderAccessQueryForUser } from "../utils/accessScope.js";

const STATUS_TRANSITIONS = {
  Pending: ["Confirmed", "Cancelled"],
  Confirmed: ["Delivered", "Cancelled"],
  Delivered: [],
  Cancelled: [],
};

const buildProductsPayload = ({ products, product, quantity, price }) => {
  if (Array.isArray(products) && products.length > 0) {
    return products;
  }

  if (product && quantity && price) {
    return [
      {
        productName: product,
        quantity: Number(quantity),
        price: Number(price),
      },
    ];
  }

  return [];
};

const sanitizeProducts = (products) =>
  products.map((item) => ({
    productName: item.productName?.trim(),
    quantity: Number(item.quantity),
    price: Number(item.price),
  }));

const validateProducts = (products) => {
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error("At least one product is required");
  }

  for (const item of products) {
    if (!item.productName || Number.isNaN(item.quantity) || Number.isNaN(item.price)) {
      throw new Error("Each product must include name, quantity, and price");
    }

    if (item.quantity <= 0) {
      throw new Error("Product quantity must be greater than zero");
    }

    if (item.price < 0) {
      throw new Error("Product price cannot be negative");
    }
  }
};

const populateOrder = (query) =>
  query
    .populate("leadId", "name phone status area requirement")
    .populate("dealerId", "name businessName area phone status")
    .populate("createdBy", "name email role");

// @desc    Create order
// @route   POST /api/orders
// @access  Private/Admin/Sales
export const createOrder = asyncHandler(async (req, res) => {
  const { leadId, dealerId, notes = "" } = req.body;
  const products = sanitizeProducts(buildProductsPayload(req.body));

  if (!leadId || products.length === 0) {
    res.status(400);
    throw new Error("Converted lead and at least one product are required");
  }

  validateProducts(products);

  const lead = await Lead.findById(leadId);
  if (!lead) {
    res.status(404);
    throw new Error("Lead not found");
  }

  if (lead.status !== "Converted") {
    res.status(400);
    throw new Error("Orders can only be created for converted leads");
  }

  if (
    req.user.role === "salesperson" &&
    lead.assignedSales?.toString() !== req.user._id.toString() &&
    lead.createdBy?.toString() !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error("You can only create orders for leads within your scope");
  }

  const existingOrder = await Order.findOne({ leadId: lead._id });
  if (existingOrder) {
    res.status(400);
    throw new Error("An order already exists for this lead");
  }

  let dealer = null;
  if (req.user.role === "dealer") {
    dealer = await getDealerForUser(req.user._id);
    if (!dealer || lead.assignedDealer?.toString() !== dealer._id.toString()) {
      res.status(403);
      throw new Error("Forbidden");
    }
  } else if (dealerId) {
    dealer = await Dealer.findById(dealerId);
  } else if (lead.assignedDealer) {
    dealer = await Dealer.findById(lead.assignedDealer);
  }

  if (!dealer) {
    res.status(400);
    throw new Error("Dealer is required to create an order");
  }

  const order = await Order.create({
    leadId: lead._id,
    dealerId: dealer._id,
    products,
    notes: notes.trim(),
    createdBy: req.user._id,
  });

  await logActivity({
    type: "order",
    entityType: "order",
    entityId: order._id,
    message: `Order created for ${dealer.name}`,
    user: req.user._id,
    metadata: {
      leadId: lead._id,
      dealerId: dealer._id,
      totalAmount: order.totalAmount,
    },
  });

  const populatedOrder = await populateOrder(Order.findById(order._id));
  res.status(201).json(populatedOrder);
});

// @desc    Get orders
// @route   GET /api/orders
// @access  Private
export const getOrders = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    paymentStatus,
    search,
  } = req.query;

  const query = await getOrderAccessQueryForUser(req.user);
  if (status) query.status = status;
  if (paymentStatus) query.paymentStatus = paymentStatus;

  if (search) {
    const matchingLeadIds = await Lead.find({
      name: { $regex: search, $options: "i" },
    }).select("_id");

    query.$or = [
      { "products.productName": { $regex: search, $options: "i" } },
      { leadId: { $in: matchingLeadIds.map((lead) => lead._id) } },
    ];
  }

  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const skip = (safePage - 1) * safeLimit;

  const [total, orders, revenueRows] = await Promise.all([
    Order.countDocuments(query),
    populateOrder(
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
    ),
    Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$dealerId",
          totalRevenue: { $sum: "$totalAmount" },
          totalOrders: { $sum: 1 },
        },
      },
    ]),
  ]);

  const totalRevenue = revenueRows.reduce((sum, row) => sum + row.totalRevenue, 0);

  res.json({
    orders,
    total,
    page: safePage,
    pages: Math.ceil(total / safeLimit) || 1,
    summary: {
      totalRevenue,
      totalOrders: total,
      dealerWiseSales: revenueRows,
    },
  });
});

// @desc    Get single order with payments and timeline
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = asyncHandler(async (req, res) => {
  const accessQuery = await getOrderAccessQueryForUser(req.user);
  const order = await populateOrder(Order.findOne({ _id: req.params.id, ...accessQuery }));

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  const [payments, timeline] = await Promise.all([
    Payment.find({ orderId: order._id }).sort({ paymentDate: -1 }),
    Activity.find({ entityType: "order", entityId: order._id })
      .populate("userId", "name email role")
      .sort({ createdAt: -1 }),
  ]);

  res.json({ ...order.toObject(), payments, timeline });
});

// @desc    Update order
// @route   PUT /api/orders/:id
// @access  Private/Admin/Sales
export const updateOrder = asyncHandler(async (req, res) => {
  const accessQuery = await getOrderAccessQueryForUser(req.user);
  const order = await Order.findOne({ _id: req.params.id, ...accessQuery });

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (req.user.role === "dealer") {
    res.status(403);
    throw new Error("Dealers can only track orders");
  }

  const { status, notes, products } = req.body;
  const previousStatus = order.status;

  if (status && status !== previousStatus) {
    const allowedNext = STATUS_TRANSITIONS[previousStatus] || [];
    if (!allowedNext.includes(status)) {
      res.status(400);
      throw new Error(`Invalid status transition from ${previousStatus} to ${status}`);
    }
    order.status = status;
  }

  if (notes !== undefined) {
    order.notes = notes.trim();
  }

  if (Array.isArray(products) && products.length > 0) {
    const sanitizedProducts = sanitizeProducts(products);
    validateProducts(sanitizedProducts);
    order.products = sanitizedProducts;
  }

  await order.save();
  await syncOrderPaymentSnapshot(order._id);

  await logActivity({
    type: "order",
    entityType: "order",
    entityId: order._id,
    message:
      previousStatus !== order.status
        ? `Order status changed from ${previousStatus} to ${order.status}`
        : "Order details updated",
    user: req.user._id,
    metadata: {
      previousStatus,
      status: order.status,
      totalAmount: order.totalAmount,
    },
  });

  const updatedOrder = await populateOrder(Order.findById(order._id));
  res.json(updatedOrder);
});

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private/Admin
export const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  await Promise.all([
    Payment.deleteMany({ orderId: order._id }),
    Order.findByIdAndDelete(order._id),
    logActivity({
      type: "order",
      entityType: "order",
      entityId: order._id,
      message: "Order deleted",
      user: req.user._id,
      metadata: {
        dealerId: order.dealerId,
        totalAmount: order.totalAmount,
      },
    }),
  ]);

  res.json({ message: "Order removed" });
});
