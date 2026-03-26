import asyncHandler from "express-async-handler";
import Dealer from "../models/dealerModel.js";
import Lead from "../models/leadModel.js";
import Order from "../models/orderModel.js";
import Payment from "../models/paymentModel.js";
import User from "../models/userModel.js";

// @desc    Get dashboard metrics
// @route   GET /api/analytics/summary
// @access  Private
export const getSummary = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalDealers = await Dealer.countDocuments();
  const totalLeads = await Lead.countDocuments();
  const newLeads = await Lead.countDocuments({ status: "New" });
  const convertedLeads = await Lead.countDocuments({ status: "Converted" });
  const totalOrders = await Order.countDocuments();

  const orders = await Order.find();
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);

  const payments = await Payment.find();
  const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);

  res.json({
    totalUsers,
    totalDealers,
    totalLeads,
    newLeads,
    convertedLeads,
    totalOrders,
    totalRevenue,
    totalPaid,
  });
});

// @desc    Get dealer-specific dashboard data
// @route   GET /api/analytics/dealer
// @access  Private/Dealer
export const getDealerSummary = asyncHandler(async (req, res) => {
  const dealer = await Dealer.findOne({ userId: req.user._id });
  if (!dealer) {
    res.status(404);
    throw new Error("Dealer not found");
  }

  const leads = await Lead.find({ assignedDealer: dealer._id });
  const orders = await Order.find({ dealerId: dealer._id });
  const payments = await Payment.find({ dealerId: dealer._id });

  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);

  res.json({
    dealer: {
      id: dealer._id,
      name: dealer.name,
      area: dealer.area,
    },
    leads: {
      total: leads.length,
      new: leads.filter((l) => l.status === "New").length,
      converted: leads.filter((l) => l.status === "Converted").length,
    },
    orders: {
      total: orders.length,
      revenue: totalRevenue,
    },
    payments: {
      total: payments.length,
      paid: totalPaid,
    },
  });
});
