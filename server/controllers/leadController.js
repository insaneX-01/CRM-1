import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

import Activity from "../models/activityModel.js";
import Dealer from "../models/dealerModel.js";
import Lead from "../models/leadModel.js";
import LeadNote from "../models/leadNoteModel.js";
import SalesProfile from "../models/salesProfileModel.js";
import User from "../models/userModel.js";
import { logActivity } from "../utils/activityLogger.js";

const phonePattern = /^[0-9]{10,15}$/;

const normalizePhone = (phone = "") => phone.replace(/\D/g, "");

const ensureObjectId = (value, message) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error(message);
  }

  return new mongoose.Types.ObjectId(value);
};

const findDealerByArea = async (area) => {
  if (!area) return null;

  return Dealer.findOne({
    area: { $regex: `^${area.trim()}$`, $options: "i" },
  }).sort({ createdAt: 1 });
};

const getDealerForUser = async (userId) => Dealer.findOne({ userId });
const getSalesProfileForUser = async (userId) => SalesProfile.findOne({ userId });

const getLeadAccessQuery = async (req) => {
  if (req.user.role === "admin") {
    return {};
  }

  if (req.user.role === "dealer") {
    const dealer = await getDealerForUser(req.user._id);
    if (!dealer) {
      return { assignedDealer: null, _id: null };
    }

    return { assignedDealer: dealer._id };
  }

  if (req.user.role === "salesperson") {
    return {
      $or: [
        { assignedSales: req.user._id },
        { createdBy: req.user._id },
      ],
    };
  }

  return { createdBy: req.user._id };
};

const validateLeadPayload = ({ name, phone, area }, partial = false) => {
  if (!partial || name !== undefined) {
    if (!name?.trim()) {
      throw new Error("Lead name is required");
    }
  }

  if (!partial || phone !== undefined) {
    const normalizedPhone = normalizePhone(phone);
    if (!phonePattern.test(normalizedPhone)) {
      throw new Error("Enter a valid phone number with 10 to 15 digits");
    }
  }

  if (!partial || area !== undefined) {
    if (!area?.trim()) {
      throw new Error("Area is required");
    }
  }
};

const populateLead = (query) =>
  query
    .populate("assignedDealer", "name businessName area phone status")
    .populate("assignedSales", "name email phone role status")
    .populate("createdBy", "name email role");

const syncDealerPerformance = async (dealerId) => {
  if (!dealerId) return;

  const dealerObjectId = typeof dealerId === "string" ? new mongoose.Types.ObjectId(dealerId) : dealerId;

  const [stats] = await Lead.aggregate([
    { $match: { assignedDealer: dealerObjectId } },
    {
      $group: {
        _id: "$assignedDealer",
        totalLeads: { $sum: 1 },
        convertedLeads: {
          $sum: {
            $cond: [{ $eq: ["$status", "Converted"] }, 1, 0],
          },
        },
      },
    },
  ]);

  await Dealer.findByIdAndUpdate(dealerObjectId, {
    $set: {
      "performance.totalLeads": stats?.totalLeads || 0,
      "performance.convertedLeads": stats?.convertedLeads || 0,
    },
  });
};

const syncSalesAssignments = async (leadId, previousSalesId, nextSalesId) => {
  if (previousSalesId) {
    await SalesProfile.findOneAndUpdate(
      { userId: previousSalesId },
      { $pull: { assignedLeads: leadId } }
    );
  }

  if (nextSalesId) {
    await SalesProfile.findOneAndUpdate(
      { userId: nextSalesId },
      { $addToSet: { assignedLeads: leadId } }
    );
  }
};

const buildCsv = (leads) => {
  const rows = [
    ["Name", "Phone", "Area", "Requirement", "Status", "Assigned Dealer", "Assigned Sales", "Created By", "Created At"],
    ...leads.map((lead) => [
      lead.name,
      lead.phone,
      lead.area,
      lead.requirement,
      lead.status,
      lead.assignedDealer?.name || "",
      lead.assignedSales?.name || "",
      lead.createdBy?.name || "",
      lead.createdAt.toISOString(),
    ]),
  ];

  return rows
    .map((row) =>
      row
        .map((value = "") => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");
};

const mergeSearchIntoQuery = (query, searchConditions) => {
  if (!query.$or) {
    query.$or = searchConditions;
    return query;
  }

  const existingOr = query.$or;
  delete query.$or;
  query.$and = [...(query.$and || []), { $or: existingOr }, { $or: searchConditions }];
  return query;
};

// @desc    Create a lead
// @route   POST /api/leads
// @access  Private/Admin/Sales
export const createLead = asyncHandler(async (req, res) => {
  const {
    name,
    phone,
    area,
    requirement = "",
    assignedDealerId,
    assignedSalesId,
    autoAssign = false,
  } = req.body;

  try {
    validateLeadPayload({ name, phone, area });
  } catch (error) {
    res.status(400);
    throw error;
  }

  let assignedDealer = null;
  if (assignedDealerId) {
    assignedDealer = await Dealer.findById(assignedDealerId);
    if (!assignedDealer) {
      res.status(400);
      throw new Error("Assigned dealer not found");
    }
  } else if (autoAssign) {
    assignedDealer = await findDealerByArea(area);
  }

  let assignedSales = null;
  if (assignedSalesId && req.user.role === "admin") {
    assignedSales = await User.findOne({ _id: assignedSalesId, role: "salesperson" });
    if (!assignedSales) {
      res.status(400);
      throw new Error("Assigned sales user not found");
    }
  } else if (req.user.role === "salesperson") {
    assignedSales = req.user;
  }

  const normalizedPhone = normalizePhone(phone);

  const lead = await Lead.create({
    name: name.trim(),
    phone: normalizedPhone,
    area: area.trim(),
    requirement: requirement.trim(),
    assignedDealer: assignedDealer?._id,
    assignedSales: assignedSales?._id || null,
    createdBy: req.user._id,
  });

  await Promise.all([
    assignedDealer ? syncDealerPerformance(assignedDealer._id) : Promise.resolve(),
    assignedSales ? syncSalesAssignments(lead._id, null, assignedSales._id) : Promise.resolve(),
    logActivity({
      type: "lead_update",
      entityType: "lead",
      entityId: lead._id,
      message: assignedDealer
        ? `Lead created and assigned to ${assignedDealer.name}`
        : assignedSales
          ? `Lead created and assigned to sales ${assignedSales.name}`
          : "Lead created",
      user: req.user._id,
      metadata: {
        status: lead.status,
        assignedDealer: assignedDealer?._id || null,
        salesId: assignedSales?._id || null,
      },
    }),
    assignedDealer
      ? logActivity({
          type: "dealer_action",
          entityType: "dealer",
          entityId: assignedDealer._id,
          message: `Lead ${lead.name} assigned to dealer`,
          user: req.user._id,
          metadata: {
            leadId: lead._id,
            autoAssign,
          },
        })
      : Promise.resolve(),
    assignedSales
      ? logActivity({
          type: "dealer_action",
          entityType: "sales",
          entityId: assignedSales._id,
          message: `Lead ${lead.name} assigned to sales user`,
          user: req.user._id,
          metadata: {
            leadId: lead._id,
            salesId: assignedSales._id,
          },
        })
      : Promise.resolve(),
  ]);

  const populatedLead = await populateLead(Lead.findById(lead._id));
  res.status(201).json(populatedLead);
});

// @desc    Get leads
// @route   GET /api/leads
// @access  Private
export const getLeads = asyncHandler(async (req, res) => {
  const {
    status,
    search,
    area,
    dealerId,
    salesId,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  const query = await getLeadAccessQuery(req);

  if (status) {
    query.status = status;
  }

  if (area) {
    query.area = { $regex: area, $options: "i" };
  }

  if (dealerId && req.user.role === "admin") {
    query.assignedDealer = ensureObjectId(dealerId, "Invalid dealer filter");
  }

  if (salesId && req.user.role === "admin") {
    query.assignedSales = ensureObjectId(salesId, "Invalid sales filter");
  }

  if (search) {
    mergeSearchIntoQuery(query, [
      { name: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { requirement: { $regex: search, $options: "i" } },
    ]);
  }

  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const sortDirection = sortOrder === "asc" ? 1 : -1;
  const allowedSortFields = ["createdAt", "updatedAt", "name", "status", "area"];
  const resolvedSortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
  const skip = (safePage - 1) * safeLimit;

  const [total, leads, dealers, salesUsers] = await Promise.all([
    Lead.countDocuments(query),
    populateLead(
      Lead.find(query)
        .sort({ [resolvedSortField]: sortDirection })
        .skip(skip)
        .limit(safeLimit)
    ),
    req.user.role === "admin"
      ? Dealer.find().select("name businessName area phone status performance")
      : Promise.resolve([]),
    req.user.role === "admin"
      ? User.find({ role: "salesperson" }).select("name email phone status area")
      : Promise.resolve([]),
  ]);

  res.json({
    leads,
    total,
    page: safePage,
    pages: Math.ceil(total / safeLimit) || 1,
    filters: {
      status: status || "",
      area: area || "",
      dealerId: dealerId || "",
      salesId: salesId || "",
      search: search || "",
    },
    dealers,
    salesUsers,
  });
});

// @desc    Export leads as CSV
// @route   GET /api/leads/export
// @access  Private
export const exportLeads = asyncHandler(async (req, res) => {
  const query = await getLeadAccessQuery(req);

  if (req.query.status) {
    query.status = req.query.status;
  }

  if (req.query.area) {
    query.area = { $regex: req.query.area, $options: "i" };
  }

  if (req.query.search) {
    mergeSearchIntoQuery(query, [
      { name: { $regex: req.query.search, $options: "i" } },
      { phone: { $regex: req.query.search, $options: "i" } },
      { requirement: { $regex: req.query.search, $options: "i" } },
    ]);
  }

  if (req.query.dealerId && req.user.role === "admin") {
    query.assignedDealer = ensureObjectId(req.query.dealerId, "Invalid dealer filter");
  }

  if (req.query.salesId && req.user.role === "admin") {
    query.assignedSales = ensureObjectId(req.query.salesId, "Invalid sales filter");
  }

  const leads = await populateLead(Lead.find(query).sort({ createdAt: -1 }));
  const csv = buildCsv(leads);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="leads-export.csv"');
  res.send(csv);
});

// @desc    Get single lead
// @route   GET /api/leads/:id
// @access  Private
export const getLeadById = asyncHandler(async (req, res) => {
  const accessQuery = await getLeadAccessQuery(req);
  const lead = await populateLead(
    Lead.findOne({
      _id: req.params.id,
      ...accessQuery,
    })
  );

  if (!lead) {
    res.status(404);
    throw new Error("Lead not found");
  }

  const notes = await LeadNote.find({ leadId: lead._id })
    .populate("salesId", "name email phone")
    .sort({ createdAt: -1 });

  res.json({
    ...lead.toObject(),
    notes,
  });
});

// @desc    Get lead activity timeline
// @route   GET /api/leads/:id/activity
// @access  Private
export const getLeadActivity = asyncHandler(async (req, res) => {
  const accessQuery = await getLeadAccessQuery(req);
  const lead = await Lead.findOne({ _id: req.params.id, ...accessQuery }).select("_id");

  if (!lead) {
    res.status(404);
    throw new Error("Lead not found");
  }

  const activities = await Activity.find({
    entityType: "lead",
    entityId: lead._id,
  })
    .populate("userId", "name email role")
    .sort({ createdAt: -1 });

  res.json(activities);
});

// @desc    Get lead notes
// @route   GET /api/leads/:id/notes
// @access  Private
export const getLeadNotes = asyncHandler(async (req, res) => {
  const accessQuery = await getLeadAccessQuery(req);
  const lead = await Lead.findOne({ _id: req.params.id, ...accessQuery }).select("_id");

  if (!lead) {
    res.status(404);
    throw new Error("Lead not found");
  }

  const notes = await LeadNote.find({ leadId: lead._id })
    .populate("salesId", "name email phone")
    .sort({ createdAt: -1 });

  res.json(notes);
});

// @desc    Add lead note
// @route   POST /api/leads/:id/notes
// @access  Private/Admin/Salesperson
export const addLeadNote = asyncHandler(async (req, res) => {
  const accessQuery = await getLeadAccessQuery(req);
  const lead = await Lead.findOne({ _id: req.params.id, ...accessQuery });

  if (!lead) {
    res.status(404);
    throw new Error("Lead not found");
  }

  if (!["admin", "salesperson"].includes(req.user.role)) {
    res.status(403);
    throw new Error("Only admin and sales users can add notes");
  }

  const { note } = req.body;
  if (!note?.trim()) {
    res.status(400);
    throw new Error("Note is required");
  }

  const salesId = req.user.role === "salesperson" ? req.user._id : lead.assignedSales;
  if (!salesId) {
    res.status(400);
    throw new Error("A sales user must be linked to this note");
  }

  const createdNote = await LeadNote.create({
    leadId: lead._id,
    salesId,
    note: note.trim(),
  });

  await logActivity({
    type: "lead_update",
    entityType: "lead",
    entityId: lead._id,
    message: "Lead note added",
    user: req.user._id,
    metadata: {
      salesId,
      noteId: createdNote._id,
    },
  });

  res.status(201).json(
    await LeadNote.findById(createdNote._id).populate("salesId", "name email phone")
  );
});

// @desc    Update lead
// @route   PUT /api/leads/:id
// @access  Private
export const updateLead = asyncHandler(async (req, res) => {
  const accessQuery = await getLeadAccessQuery(req);
  const lead = await Lead.findOne({ _id: req.params.id, ...accessQuery });

  if (!lead) {
    res.status(404);
    throw new Error("Lead not found");
  }

  if (req.user.role === "dealer") {
    res.status(403);
    throw new Error("Dealers can only update lead status");
  }

  const { name, phone, area, requirement, assignedDealerId, assignedSalesId, lostReason = "" } = req.body;

  try {
    validateLeadPayload({ name, phone, area }, true);
  } catch (error) {
    res.status(400);
    throw error;
  }

  const previousDealerId = lead.assignedDealer?.toString() || null;
  const previousSalesId = lead.assignedSales?.toString() || null;

  if (name !== undefined) lead.name = name.trim();
  if (phone !== undefined) lead.phone = normalizePhone(phone);
  if (area !== undefined) lead.area = area.trim();
  if (requirement !== undefined) lead.requirement = requirement.trim();
  if (lostReason !== undefined) lead.lostReason = lostReason.trim();

  if (assignedDealerId !== undefined && req.user.role === "admin") {
    if (!assignedDealerId) {
      lead.assignedDealer = undefined;
    } else {
      const dealer = await Dealer.findById(assignedDealerId);
      if (!dealer) {
        res.status(400);
        throw new Error("Assigned dealer not found");
      }
      lead.assignedDealer = dealer._id;
    }
  }

  if (assignedSalesId !== undefined && req.user.role === "admin") {
    if (!assignedSalesId) {
      lead.assignedSales = null;
    } else {
      const salesUser = await User.findOne({ _id: assignedSalesId, role: "salesperson" });
      if (!salesUser) {
        res.status(400);
        throw new Error("Assigned sales user not found");
      }
      lead.assignedSales = salesUser._id;
    }
  }

  await lead.save();

  await Promise.all([
    syncDealerPerformance(previousDealerId),
    syncDealerPerformance(lead.assignedDealer),
    syncSalesAssignments(lead._id, previousSalesId, lead.assignedSales),
    logActivity({
      type: "lead_update",
      entityType: "lead",
      entityId: lead._id,
      message: "Lead details updated",
      user: req.user._id,
      metadata: {
        assignedDealer: lead.assignedDealer || null,
        salesId: lead.assignedSales || null,
        status: lead.status,
      },
    }),
  ]);

  const updatedLead = await populateLead(Lead.findById(lead._id));
  res.json(updatedLead);
});

// @desc    Update lead status
// @route   PATCH /api/leads/:id/status
// @access  Private
export const updateLeadStatus = asyncHandler(async (req, res) => {
  const accessQuery = await getLeadAccessQuery(req);
  const lead = await Lead.findOne({ _id: req.params.id, ...accessQuery });

  if (!lead) {
    res.status(404);
    throw new Error("Lead not found");
  }

  const { status, lostReason = "" } = req.body;
  if (!["New", "Contacted", "Converted", "Lost"].includes(status)) {
    res.status(400);
    throw new Error("Invalid lead status");
  }

  if (req.user.role === "dealer" && !lead.assignedDealer) {
    res.status(403);
    throw new Error("Dealers can only update assigned leads");
  }

  const previousStatus = lead.status;
  lead.status = status;

  if (status === "Lost") {
    if (!lostReason?.trim()) {
      res.status(400);
      throw new Error("Lost reason is required when marking a lead as lost");
    }
    lead.lostReason = lostReason.trim();
  } else if (lostReason !== undefined) {
    lead.lostReason = lostReason.trim();
  }

  await lead.save();

  await Promise.all([
    syncDealerPerformance(lead.assignedDealer),
    logActivity({
      type: "lead_update",
      entityType: "lead",
      entityId: lead._id,
      message: `Lead status changed from ${previousStatus} to ${status}`,
      user: req.user._id,
      metadata: {
        previousStatus,
        status,
        lostReason: lead.lostReason,
        salesId: lead.assignedSales || null,
        convertedReadyForOrder: status === "Converted",
      },
    }),
    status === "Converted" && lead.assignedSales
      ? logActivity({
          type: "dealer_action",
          entityType: "sales",
          entityId: lead.assignedSales,
          message: `Lead ${lead.name} converted`,
          user: req.user._id,
          metadata: {
            leadId: lead._id,
            previousStatus,
          },
        })
      : Promise.resolve(),
  ]);

  const updatedLead = await populateLead(Lead.findById(lead._id));
  res.json(updatedLead);
});

// @desc    Delete lead
// @route   DELETE /api/leads/:id
// @access  Private/Admin
export const deleteLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);

  if (!lead) {
    res.status(404);
    throw new Error("Lead not found");
  }

  const previousDealerId = lead.assignedDealer;
  const previousSalesId = lead.assignedSales;
  await Lead.findByIdAndDelete(req.params.id);

  await Promise.all([
    syncDealerPerformance(previousDealerId),
    syncSalesAssignments(lead._id, previousSalesId, null),
    LeadNote.deleteMany({ leadId: lead._id }),
    logActivity({
      type: "lead_update",
      entityType: "lead",
      entityId: lead._id,
      message: "Lead deleted",
      user: req.user._id,
      metadata: {
        name: lead.name,
        status: lead.status,
      },
    }),
  ]);

  res.json({ message: "Lead deleted" });
});

// @desc    Assign lead to dealer
// @route   PUT /api/leads/:id/assign
// @access  Private/Admin
export const assignLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);

  if (!lead) {
    res.status(404);
    throw new Error("Lead not found");
  }

  const { dealerId, autoAssign = false } = req.body;
  const previousDealerId = lead.assignedDealer?.toString() || null;

  let dealer = null;
  if (dealerId) {
    dealer = await Dealer.findById(dealerId);
  } else if (autoAssign) {
    dealer = await findDealerByArea(lead.area);
  }

  if (!dealer) {
    res.status(404);
    throw new Error("No dealer found for assignment");
  }

  lead.assignedDealer = dealer._id;
  await lead.save();

  await Promise.all([
    syncDealerPerformance(previousDealerId),
    syncDealerPerformance(dealer._id),
    logActivity({
      type: "lead_update",
      entityType: "lead",
      entityId: lead._id,
      message: `Lead assigned to ${dealer.name}`,
      user: req.user._id,
      metadata: {
        assignedDealer: dealer._id,
        previousDealer: previousDealerId,
        autoAssign,
      },
    }),
    logActivity({
      type: "dealer_action",
      entityType: "dealer",
      entityId: dealer._id,
      message: `Lead ${lead.name} assigned to dealer`,
      user: req.user._id,
      metadata: {
        leadId: lead._id,
        previousDealer: previousDealerId,
        autoAssign,
      },
    }),
  ]);

  const updatedLead = await populateLead(Lead.findById(lead._id));
  res.json(updatedLead);
});

// @desc    Assign lead to sales user
// @route   PUT /api/leads/:id/assign-sales
// @access  Private/Admin
export const assignLeadToSales = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);

  if (!lead) {
    res.status(404);
    throw new Error("Lead not found");
  }

  const { salesId } = req.body;
  if (!salesId) {
    res.status(400);
    throw new Error("Sales user is required");
  }

  const salesUser = await User.findOne({ _id: salesId, role: "salesperson" });
  if (!salesUser) {
    res.status(404);
    throw new Error("Sales user not found");
  }

  const previousSalesId = lead.assignedSales?.toString() || null;
  lead.assignedSales = salesUser._id;
  await lead.save();

  await Promise.all([
    syncSalesAssignments(lead._id, previousSalesId, salesUser._id),
    logActivity({
      type: "lead_update",
      entityType: "lead",
      entityId: lead._id,
      message: `Lead assigned to sales ${salesUser.name}`,
      user: req.user._id,
      metadata: {
        salesId: salesUser._id,
        previousSalesId,
      },
    }),
    logActivity({
      type: "dealer_action",
      entityType: "sales",
      entityId: salesUser._id,
      message: `New lead ${lead.name} assigned`,
      user: req.user._id,
      metadata: {
        leadId: lead._id,
        previousSalesId,
        salesId: salesUser._id,
      },
    }),
  ]);

  const updatedLead = await populateLead(Lead.findById(lead._id));
  res.json(updatedLead);
});
