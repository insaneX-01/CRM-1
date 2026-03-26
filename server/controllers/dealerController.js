import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

import Activity from "../models/activityModel.js";
import Dealer from "../models/dealerModel.js";
import Lead from "../models/leadModel.js";
import Order from "../models/orderModel.js";
import Payment from "../models/paymentModel.js";
import User from "../models/userModel.js";
import { logActivity } from "../utils/activityLogger.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9]{10,15}$/;

const normalizePhone = (phone = "") => phone.replace(/\D/g, "");

const validateDealerPayload = ({
  name,
  businessName,
  phone,
  email,
  area,
  address,
  password,
}, { partial = false, requirePassword = false } = {}) => {
  if (!partial || name !== undefined) {
    if (!name?.trim()) throw new Error("Name is required");
  }
  if (!partial || businessName !== undefined) {
    if (!businessName?.trim()) throw new Error("Business name is required");
  }
  if (!partial || phone !== undefined) {
    if (!phonePattern.test(normalizePhone(phone))) {
      throw new Error("Enter a valid phone number with 10 to 15 digits");
    }
  }
  if (!partial || email !== undefined) {
    if (!emailPattern.test((email || "").trim().toLowerCase())) {
      throw new Error("Enter a valid email address");
    }
  }
  if (!partial || area !== undefined) {
    if (!area?.trim()) throw new Error("Area is required");
  }
  if (!partial || address !== undefined) {
    if (!address?.trim()) throw new Error("Address is required");
  }
  if (requirePassword && !password) {
    throw new Error("Password is required");
  }
};

const populateDealer = (query) =>
  query
    .populate("userId", "name email role area status isActive")
    .populate("createdBy", "name email role");

const ensureDealerAccess = async (req, dealerId) => {
  const dealer = await populateDealer(Dealer.findById(dealerId));

  if (!dealer) {
    throw new Error("Dealer not found");
  }

  if (req.user.role === "dealer" && dealer.userId?._id.toString() !== req.user._id.toString()) {
    throw new Error("Forbidden");
  }

  return dealer;
};

const getDealerPerformanceData = async (dealerId) => {
  const dealerObjectId = typeof dealerId === "string" ? new mongoose.Types.ObjectId(dealerId) : dealerId;

  const [leadStats] = await Lead.aggregate([
    { $match: { assignedDealer: dealerObjectId } },
    {
      $group: {
        _id: "$assignedDealer",
        totalLeadsAssigned: { $sum: 1 },
        convertedLeads: {
          $sum: {
            $cond: [{ $eq: ["$status", "Converted"] }, 1, 0],
          },
        },
      },
    },
  ]);

  const [orderStats] = await Order.aggregate([
    { $match: { dealerId: dealerObjectId } },
    {
      $group: {
        _id: "$dealerId",
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: "$totalAmount" },
      },
    },
  ]);

  const [paymentStats] = await Payment.aggregate([
    { $match: { dealerId: dealerObjectId } },
    {
      $group: {
        _id: "$dealerId",
        totalPayments: { $sum: 1 },
        totalPaid: { $sum: "$amountPaid" },
      },
    },
  ]);

  const totalLeadsAssigned = leadStats?.totalLeadsAssigned || 0;
  const convertedLeads = leadStats?.convertedLeads || 0;
  const totalOrders = orderStats?.totalOrders || 0;
  const totalRevenue = orderStats?.totalRevenue || 0;
  const totalPayments = paymentStats?.totalPayments || 0;
  const totalPaid = paymentStats?.totalPaid || 0;

  return {
    totalLeadsAssigned,
    convertedLeads,
    conversionRate: totalLeadsAssigned ? Number(((convertedLeads / totalLeadsAssigned) * 100).toFixed(1)) : 0,
    totalOrders,
    totalRevenue,
    totalPayments,
    totalPaid,
    outstanding: Math.max(totalRevenue - totalPaid, 0),
  };
};

const syncDealerPerformance = async (dealerId) => {
  if (!dealerId) return;
  const metrics = await getDealerPerformanceData(dealerId);
  await Dealer.findByIdAndUpdate(dealerId, {
    $set: {
      "performance.totalLeads": metrics.totalLeadsAssigned,
      "performance.convertedLeads": metrics.convertedLeads,
      "performance.totalOrders": metrics.totalOrders,
      "performance.totalRevenue": metrics.totalRevenue,
    },
  });
};

// @desc    Create dealer
// @route   POST /api/dealers
// @access  Private/Admin
export const createDealer = asyncHandler(async (req, res) => {
  const {
    name,
    businessName,
    phone,
    email,
    area,
    address,
    gstNumber = "",
    status = "Active",
    password,
    rating = 0,
  } = req.body;

  try {
    validateDealerPayload(
      { name, businessName, phone, email, area, address, password },
      { requirePassword: true }
    );
  } catch (error) {
    res.status(400);
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = normalizePhone(phone);

  const [existingUser, existingDealerEmail, existingDealerPhone] = await Promise.all([
    User.findOne({ email: normalizedEmail }),
    Dealer.findOne({ email: normalizedEmail }),
    Dealer.findOne({ phone: normalizedPhone }),
  ]);

  if (existingUser || existingDealerEmail) {
    res.status(400);
    throw new Error("A dealer with this email already exists");
  }

  if (existingDealerPhone) {
    res.status(400);
    throw new Error("A dealer with this phone number already exists");
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    role: "dealer",
    area: area.trim(),
    isActive: status === "Active",
  });

  const dealer = await Dealer.create({
    name: name.trim(),
    businessName: businessName.trim(),
    phone: normalizedPhone,
    email: normalizedEmail,
    area: area.trim(),
    address: address.trim(),
    gstNumber: gstNumber.trim(),
    status,
    rating,
    role: "dealer",
    userId: user._id,
    createdBy: req.user._id,
  });

  await logActivity({
    type: "dealer_action",
    entityType: "dealer",
    entityId: dealer._id,
    message: "Dealer created",
    user: req.user._id,
    metadata: {
      area: dealer.area,
      status: dealer.status,
    },
  });

  const populatedDealer = await populateDealer(Dealer.findById(dealer._id));
  res.status(201).json(populatedDealer);
});

// @desc    Get all dealers
// @route   GET /api/dealers
// @access  Private/Admin
export const getDealers = asyncHandler(async (req, res) => {
  const {
    search = "",
    area = "",
    status = "",
    page = 1,
    limit = 10,
  } = req.query;

  const query = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { businessName: { $regex: search, $options: "i" } },
      { area: { $regex: search, $options: "i" } },
    ];
  }
  if (area) {
    query.area = { $regex: `^${area}$`, $options: "i" };
  }
  if (status) {
    query.status = status;
  }

  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const skip = (safePage - 1) * safeLimit;

  const [total, dealers] = await Promise.all([
    Dealer.countDocuments(query),
    populateDealer(
      Dealer.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
    ),
  ]);

  const enrichedDealers = dealers.map((dealer) => {
    const totalLeads = dealer.performance?.totalLeads || 0;
    const convertedLeads = dealer.performance?.convertedLeads || 0;
    return {
      ...dealer.toObject(),
      performance: {
        ...dealer.performance,
        conversionRate: totalLeads ? Number(((convertedLeads / totalLeads) * 100).toFixed(1)) : 0,
      },
    };
  });

  res.json({
    dealers: enrichedDealers,
    total,
    page: safePage,
    pages: Math.ceil(total / safeLimit) || 1,
  });
});

// @desc    Export dealers CSV
// @route   GET /api/dealers/export
// @access  Private/Admin
export const exportDealers = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.search) {
    query.$or = [
      { name: { $regex: req.query.search, $options: "i" } },
      { businessName: { $regex: req.query.search, $options: "i" } },
      { area: { $regex: req.query.search, $options: "i" } },
    ];
  }
  if (req.query.area) {
    query.area = { $regex: `^${req.query.area}$`, $options: "i" };
  }
  if (req.query.status) {
    query.status = req.query.status;
  }

  const dealers = await populateDealer(Dealer.find(query).sort({ createdAt: -1 }));
  const csv = [
    ["Name", "Business Name", "Phone", "Email", "Area", "Status", "Total Leads", "Conversion Rate"],
    ...dealers.map((dealer) => {
      const totalLeads = dealer.performance?.totalLeads || 0;
      const convertedLeads = dealer.performance?.convertedLeads || 0;
      const conversionRate = totalLeads ? Number(((convertedLeads / totalLeads) * 100).toFixed(1)) : 0;
      return [
        dealer.name,
        dealer.businessName,
        dealer.phone,
        dealer.email,
        dealer.area,
        dealer.status,
        totalLeads,
        conversionRate,
      ];
    }),
  ]
    .map((row) => row.map((value = "") => `"${String(value).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="dealers-export.csv"');
  res.send(csv);
});

// @desc    Get dealer profile
// @route   GET /api/dealers/:id
// @access  Private
export const getDealerById = asyncHandler(async (req, res) => {
  try {
    const dealer = await ensureDealerAccess(req, req.params.id);
    res.json(dealer);
  } catch (error) {
    res.status(error.message === "Forbidden" ? 403 : 404);
    throw error;
  }
});

// @desc    Get current dealer profile
// @route   GET /api/dealers/profile/me
// @access  Private/Dealer
export const getMyDealerProfile = asyncHandler(async (req, res) => {
  const dealer = await populateDealer(Dealer.findOne({ userId: req.user._id }));

  if (!dealer) {
    res.status(404);
    throw new Error("Dealer profile not found");
  }

  res.json(dealer);
});

// @desc    Get dealer performance
// @route   GET /api/dealers/:id/performance
// @access  Private
export const getDealerPerformance = asyncHandler(async (req, res) => {
  let dealer;
  try {
    dealer = await ensureDealerAccess(req, req.params.id);
  } catch (error) {
    res.status(error.message === "Forbidden" ? 403 : 404);
    throw error;
  }

  const metrics = await getDealerPerformanceData(dealer._id);
  res.json({
    dealer: {
      _id: dealer._id,
      name: dealer.name,
      businessName: dealer.businessName,
      area: dealer.area,
      status: dealer.status,
      rating: dealer.rating,
    },
    ...metrics,
  });
});

// @desc    Get dealer full profile summary
// @route   GET /api/dealers/:id/summary
// @access  Private
export const getDealerSummary = asyncHandler(async (req, res) => {
  let dealer;
  try {
    dealer = await ensureDealerAccess(req, req.params.id);
  } catch (error) {
    res.status(error.message === "Forbidden" ? 403 : 404);
    throw error;
  }

  const [performance, recentLeads, recentOrders, recentPayments, activities] = await Promise.all([
    getDealerPerformanceData(dealer._id),
    Lead.find({ assignedDealer: dealer._id }).sort({ createdAt: -1 }).limit(8),
    Order.find({ dealerId: dealer._id }).sort({ createdAt: -1 }).limit(8).populate("leadId", "name phone status"),
    Payment.find({ dealerId: dealer._id }).sort({ paymentDate: -1 }).limit(8).populate("orderId", "products status totalAmount"),
    Activity.find({ entityType: "dealer", entityId: dealer._id })
      .populate("userId", "name role")
      .sort({ createdAt: -1 })
      .limit(10),
  ]);

  res.json({
    dealer,
    performance,
    leads: recentLeads,
    orders: recentOrders,
    payments: recentPayments,
    activities,
  });
});

// @desc    Update dealer
// @route   PUT /api/dealers/:id
// @access  Private/Admin
export const updateDealer = asyncHandler(async (req, res) => {
  const dealer = await Dealer.findById(req.params.id);

  if (!dealer) {
    res.status(404);
    throw new Error("Dealer not found");
  }

  const {
    name,
    businessName,
    phone,
    email,
    area,
    address,
    gstNumber,
    status,
    password,
    rating,
  } = req.body;

  try {
    validateDealerPayload(
      { name, businessName, phone, email, area, address, password },
      { partial: true }
    );
  } catch (error) {
    res.status(400);
    throw error;
  }

  const user = await User.findById(dealer.userId);
  if (!user) {
    res.status(404);
    throw new Error("Linked dealer user not found");
  }

  if (email !== undefined) {
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
    const existingDealer = await Dealer.findOne({ email: normalizedEmail, _id: { $ne: dealer._id } });
    if (existingUser || existingDealer) {
      res.status(400);
      throw new Error("A dealer with this email already exists");
    }
    dealer.email = normalizedEmail;
    user.email = normalizedEmail;
  }

  if (phone !== undefined) {
    const normalizedPhone = normalizePhone(phone);
    const existingPhoneDealer = await Dealer.findOne({ phone: normalizedPhone, _id: { $ne: dealer._id } });
    if (existingPhoneDealer) {
      res.status(400);
      throw new Error("A dealer with this phone number already exists");
    }
    dealer.phone = normalizedPhone;
  }

  if (name !== undefined) {
    dealer.name = name.trim();
    user.name = name.trim();
  }
  if (businessName !== undefined) dealer.businessName = businessName.trim();
  if (area !== undefined) {
    dealer.area = area.trim();
    user.area = area.trim();
  }
  if (address !== undefined) dealer.address = address.trim();
  if (gstNumber !== undefined) dealer.gstNumber = gstNumber.trim();
  if (status !== undefined) {
    dealer.status = status;
    user.isActive = status === "Active";
  }
  if (rating !== undefined) dealer.rating = Number(rating);
  if (password) user.password = password;

  await Promise.all([dealer.save(), user.save()]);
  await syncDealerPerformance(dealer._id);

  await logActivity({
    type: "dealer_action",
    entityType: "dealer",
    entityId: dealer._id,
    message: "Dealer updated",
    user: req.user._id,
    metadata: {
      area: dealer.area,
      status: dealer.status,
    },
  });

  const updatedDealer = await populateDealer(Dealer.findById(dealer._id));
  res.json(updatedDealer);
});

// @desc    Delete dealer
// @route   DELETE /api/dealers/:id
// @access  Private/Admin
export const deleteDealer = asyncHandler(async (req, res) => {
  const dealer = await Dealer.findById(req.params.id);

  if (!dealer) {
    res.status(404);
    throw new Error("Dealer not found");
  }

  await Promise.all([
    User.findByIdAndDelete(dealer.userId),
    Dealer.findByIdAndDelete(dealer._id),
    logActivity({
      type: "dealer_action",
      entityType: "dealer",
      entityId: dealer._id,
      message: "Dealer deleted",
      user: req.user._id,
      metadata: {
        name: dealer.name,
        businessName: dealer.businessName,
      },
    }),
  ]);

  res.json({ message: "Dealer removed" });
});
