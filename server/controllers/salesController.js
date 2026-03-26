import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

import Activity from "../models/activityModel.js";
import Lead from "../models/leadModel.js";
import LeadNote from "../models/leadNoteModel.js";
import Order from "../models/orderModel.js";
import SalesProfile from "../models/salesProfileModel.js";
import User from "../models/userModel.js";
import { logActivity } from "../utils/activityLogger.js";

const phonePattern = /^[0-9]{10,15}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizePhone = (phone = "") => phone.replace(/\D/g, "");
const normalizeAreas = (areas) =>
  (Array.isArray(areas) ? areas : [areas])
    .flatMap((item) => String(item || "").split(","))
    .map((item) => item.trim())
    .filter(Boolean);

const populateSalesProfile = (query) =>
  query.populate("userId", "name email phone role status isActive").populate("createdBy", "name email role");

const getSalesPerformanceData = async (userId) => {
  const userObjectId = typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;

  const [leadStats, orderStats, noteStats] = await Promise.all([
    Lead.aggregate([
      { $match: { assignedSales: userObjectId } },
      {
        $group: {
          _id: "$assignedSales",
          totalLeadsHandled: { $sum: 1 },
          convertedLeads: {
            $sum: {
              $cond: [{ $eq: ["$status", "Converted"] }, 1, 0],
            },
          },
          contactedLeads: {
            $sum: {
              $cond: [{ $eq: ["$status", "Contacted"] }, 1, 0],
            },
          },
        },
      },
    ]),
    Order.aggregate([
      {
        $lookup: {
          from: "leads",
          localField: "leadId",
          foreignField: "_id",
          as: "lead",
        },
      },
      { $unwind: "$lead" },
      { $match: { "lead.assignedSales": userObjectId } },
      {
        $group: {
          _id: "$lead.assignedSales",
          totalRevenue: { $sum: "$totalAmount" },
          totalOrders: { $sum: 1 },
        },
      },
    ]),
    LeadNote.countDocuments({ salesId: userObjectId }),
  ]);

  const totalLeadsHandled = leadStats[0]?.totalLeadsHandled || 0;
  const convertedLeads = leadStats[0]?.convertedLeads || 0;

  return {
    totalLeadsHandled,
    convertedLeads,
    contactedLeads: leadStats[0]?.contactedLeads || 0,
    conversionRate: totalLeadsHandled ? Number(((convertedLeads / totalLeadsHandled) * 100).toFixed(1)) : 0,
    totalRevenue: orderStats[0]?.totalRevenue || 0,
    totalOrders: orderStats[0]?.totalOrders || 0,
    totalNotes: noteStats,
  };
};

const ensureSalesAccess = async (req, salesProfileId) => {
  const salesProfile = await populateSalesProfile(SalesProfile.findById(salesProfileId));

  if (!salesProfile) {
    throw new Error("Sales user not found");
  }

  if (req.user.role === "salesperson" && salesProfile.userId?._id.toString() !== req.user._id.toString()) {
    throw new Error("Forbidden");
  }

  return salesProfile;
};

// @desc    Create sales user
// @route   POST /api/sales
// @access  Private/Admin
export const createSalesUser = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    password,
    assignedAreas = [],
    status = "Active",
  } = req.body;

  if (!name?.trim()) {
    res.status(400);
    throw new Error("Name is required");
  }

  if (!emailPattern.test((email || "").trim().toLowerCase())) {
    res.status(400);
    throw new Error("Valid email is required");
  }

  if (!phonePattern.test(normalizePhone(phone))) {
    res.status(400);
    throw new Error("Valid phone number is required");
  }

  if (!password) {
    res.status(400);
    throw new Error("Password is required");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = normalizePhone(phone);
  const areas = normalizeAreas(assignedAreas);

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    res.status(400);
    throw new Error("A user with this email already exists");
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    phone: normalizedPhone,
    password,
    role: "salesperson",
    area: areas[0] || "",
    status,
  });

  const salesProfile = await SalesProfile.create({
    userId: user._id,
    phone: normalizedPhone,
    assignedAreas: areas,
    assignedLeads: [],
    status,
    createdBy: req.user._id,
  });

  await logActivity({
    type: "dealer_action",
    entityType: "sales",
    entityId: salesProfile._id,
    message: "Sales user created",
    user: req.user._id,
    metadata: {
      userId: user._id,
      assignedAreas: areas,
    },
  });

  res.status(201).json(await populateSalesProfile(SalesProfile.findById(salesProfile._id)));
});

// @desc    Get sales users
// @route   GET /api/sales
// @access  Private/Admin
export const getSalesUsers = asyncHandler(async (req, res) => {
  const { search = "", area = "", status = "", page = 1, limit = 10 } = req.query;
  const query = {};

  if (status) query.status = status;
  if (area) query.assignedAreas = { $regex: area, $options: "i" };

  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const skip = (safePage - 1) * safeLimit;

  const userQuery = { role: "salesperson" };
  if (search) {
    userQuery.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }

  const users = await User.find(userQuery).select("_id");
  query.userId = { $in: users.map((user) => user._id) };

  const [total, salesProfiles] = await Promise.all([
    SalesProfile.countDocuments(query),
    populateSalesProfile(
      SalesProfile.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit)
    ),
  ]);

  const enriched = await Promise.all(
    salesProfiles.map(async (profile) => {
      const performance = await getSalesPerformanceData(profile.userId._id);
      return {
        ...profile.toObject(),
        performance,
      };
    })
  );

  res.json({
    salesUsers: enriched,
    total,
    page: safePage,
    pages: Math.ceil(total / safeLimit) || 1,
  });
});

// @desc    Get single sales user
// @route   GET /api/sales/:id
// @access  Private
export const getSalesUserById = asyncHandler(async (req, res) => {
  try {
    const salesProfile = await ensureSalesAccess(req, req.params.id);
    res.json(salesProfile);
  } catch (error) {
    res.status(error.message === "Forbidden" ? 403 : 404);
    throw error;
  }
});

// @desc    Get current sales profile
// @route   GET /api/sales/profile/me
// @access  Private/Sales
export const getMySalesProfile = asyncHandler(async (req, res) => {
  const profile = await populateSalesProfile(SalesProfile.findOne({ userId: req.user._id }));

  if (!profile) {
    res.status(404);
    throw new Error("Sales profile not found");
  }

  res.json(profile);
});

// @desc    Get sales performance
// @route   GET /api/sales/:id/performance
// @access  Private
export const getSalesPerformance = asyncHandler(async (req, res) => {
  let salesProfile;
  try {
    salesProfile = await ensureSalesAccess(req, req.params.id);
  } catch (error) {
    res.status(error.message === "Forbidden" ? 403 : 404);
    throw error;
  }

  const performance = await getSalesPerformanceData(salesProfile.userId._id);

  res.json({
    salesUser: salesProfile,
    ...performance,
  });
});

// @desc    Get sales dashboard/profile summary
// @route   GET /api/sales/:id/summary
// @access  Private
export const getSalesSummary = asyncHandler(async (req, res) => {
  let salesProfile;
  try {
    salesProfile = await ensureSalesAccess(req, req.params.id);
  } catch (error) {
    res.status(error.message === "Forbidden" ? 403 : 404);
    throw error;
  }

  const [performance, leads, notes, activities] = await Promise.all([
    getSalesPerformanceData(salesProfile.userId._id),
    Lead.find({ assignedSales: salesProfile.userId._id })
      .populate("assignedDealer", "name businessName area")
      .sort({ updatedAt: -1 })
      .limit(20),
    LeadNote.find({ salesId: salesProfile.userId._id })
      .populate("leadId", "name status area")
      .sort({ createdAt: -1 })
      .limit(20),
    Activity.find({
      $or: [
        { entityType: "sales", entityId: salesProfile._id },
        { "metadata.salesId": salesProfile.userId._id },
      ],
    })
      .populate("userId", "name role")
      .sort({ createdAt: -1 })
      .limit(20),
  ]);

  res.json({
    salesUser: salesProfile,
    performance,
    leads,
    notes,
    activities,
  });
});

// @desc    Update sales user
// @route   PUT /api/sales/:id
// @access  Private/Admin
export const updateSalesUser = asyncHandler(async (req, res) => {
  const salesProfile = await SalesProfile.findById(req.params.id);

  if (!salesProfile) {
    res.status(404);
    throw new Error("Sales user not found");
  }

  const user = await User.findById(salesProfile.userId);
  if (!user) {
    res.status(404);
    throw new Error("Linked user not found");
  }

  const { name, email, phone, password, assignedAreas, status } = req.body;

  if (email !== undefined) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailPattern.test(normalizedEmail)) {
      res.status(400);
      throw new Error("Valid email is required");
    }
    const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
    if (existing) {
      res.status(400);
      throw new Error("A user with this email already exists");
    }
    user.email = normalizedEmail;
  }

  if (phone !== undefined) {
    const normalizedPhone = normalizePhone(phone);
    if (!phonePattern.test(normalizedPhone)) {
      res.status(400);
      throw new Error("Valid phone number is required");
    }
    user.phone = normalizedPhone;
    salesProfile.phone = normalizedPhone;
  }

  if (name !== undefined) user.name = name.trim();
  if (password) user.password = password;
  if (status !== undefined) {
    user.status = status;
    salesProfile.status = status;
  }
  if (assignedAreas !== undefined) {
    const normalizedAreas = normalizeAreas(assignedAreas);
    salesProfile.assignedAreas = normalizedAreas;
    user.area = normalizedAreas[0] || "";
  }

  await Promise.all([user.save(), salesProfile.save()]);

  await logActivity({
    type: "dealer_action",
    entityType: "sales",
    entityId: salesProfile._id,
    message: "Sales user updated",
    user: req.user._id,
    metadata: {
      userId: user._id,
    },
  });

  res.json(await populateSalesProfile(SalesProfile.findById(salesProfile._id)));
});

// @desc    Delete sales user
// @route   DELETE /api/sales/:id
// @access  Private/Admin
export const deleteSalesUser = asyncHandler(async (req, res) => {
  const salesProfile = await SalesProfile.findById(req.params.id);

  if (!salesProfile) {
    res.status(404);
    throw new Error("Sales user not found");
  }

  await Promise.all([
    User.findByIdAndDelete(salesProfile.userId),
    SalesProfile.findByIdAndDelete(salesProfile._id),
    Lead.updateMany(
      { assignedSales: salesProfile.userId },
      { $set: { assignedSales: null } }
    ),
    LeadNote.deleteMany({ salesId: salesProfile.userId }),
    logActivity({
      type: "dealer_action",
      entityType: "sales",
      entityId: salesProfile._id,
      message: "Sales user deleted",
      user: req.user._id,
      metadata: {
        userId: salesProfile.userId,
      },
    }),
  ]);

  res.json({ message: "Sales user removed" });
});
