import asyncHandler from "express-async-handler";

import Activity from "../models/activityModel.js";
import Complaint from "../models/complaintModel.js";
import Dealer from "../models/dealerModel.js";
import User from "../models/userModel.js";
import { logActivity } from "../utils/activityLogger.js";

const STATUS_FLOW = {
  Open: ["In Progress"],
  "In Progress": ["Resolved"],
  Resolved: ["Closed"],
  Closed: [],
};

const normalizeComplaint = (complaint) =>
  Complaint.findById(complaint._id)
    .populate("dealerId", "name businessName area phone")
    .populate("assignedTo", "name email role")
    .populate("createdBy", "name email role");

const getDealerForUser = async (userId) => Dealer.findOne({ userId });

const canManageComplaint = (role) => role === "admin" || role === "salesperson";

const validateStatusTransition = (currentStatus, nextStatus) => {
  if (!nextStatus || nextStatus === currentStatus) return;
  if (!STATUS_FLOW[currentStatus]?.includes(nextStatus)) {
    throw new Error(`Invalid complaint status transition from ${currentStatus} to ${nextStatus}`);
  }
};

const ensureComplaintAccess = async (req, complaintId) => {
  const complaint = await Complaint.findById(complaintId)
    .populate("dealerId", "name businessName area phone")
    .populate("assignedTo", "name email role")
    .populate("createdBy", "name email role");

  if (!complaint) {
    throw new Error("Complaint not found");
  }

  if (req.user.role === "dealer") {
    const dealer = await getDealerForUser(req.user._id);
    if (!dealer || complaint.dealerId?._id.toString() !== dealer._id.toString()) {
      throw new Error("Forbidden");
    }
  }

  return complaint;
};

// @desc    Create complaint
// @route   POST /api/complaints
// @access  Private/Dealer
export const createComplaint = asyncHandler(async (req, res) => {
  const { subject, title, description, priority = "Medium" } = req.body;
  const resolvedSubject = (subject || title || "").trim();

  if (!resolvedSubject || !description?.trim()) {
    res.status(400);
    throw new Error("Subject and description are required");
  }

  const dealer = await getDealerForUser(req.user._id);
  if (!dealer) {
    res.status(403);
    throw new Error("Only dealers can create complaints");
  }

  const complaint = await Complaint.create({
    dealerId: dealer._id,
    subject: resolvedSubject,
    description: description.trim(),
    priority,
    createdBy: req.user._id,
  });

  await logActivity({
    type: "complaint",
    entityType: "complaint",
    entityId: complaint._id,
    message: `Complaint created: ${resolvedSubject}`,
    user: req.user._id,
    metadata: {
      dealerId: dealer._id,
      priority: complaint.priority,
      status: complaint.status,
    },
  });

  const populatedComplaint = await normalizeComplaint(complaint);
  res.status(201).json(populatedComplaint);
});

// @desc    Get complaints
// @route   GET /api/complaints
// @access  Private
export const getComplaints = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status = "",
    priority = "",
    search = "",
  } = req.query;

  const query = {};

  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (search) {
    query.$or = [
      { subject: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  if (req.user.role === "dealer") {
    const dealer = await getDealerForUser(req.user._id);
    if (!dealer) {
      return res.json({ complaints: [], total: 0, page: 1, pages: 1, summary: {} });
    }
    query.dealerId = dealer._id;
  }

  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const skip = (safePage - 1) * safeLimit;

  const [total, complaints, statusRows, supportUsers] = await Promise.all([
    Complaint.countDocuments(query),
    Complaint.find(query)
      .populate("dealerId", "name businessName area")
      .populate("assignedTo", "name email role")
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(safeLimit),
    Complaint.aggregate([
      { $match: query },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    canManageComplaint(req.user.role)
      ? User.find({ role: { $in: ["admin", "salesperson"] } }).select("name email role status").sort({ name: 1 })
      : Promise.resolve([]),
  ]);

  const summary = {
    total,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
  };

  statusRows.forEach((row) => {
    if (row._id === "Open") summary.open = row.count;
    if (row._id === "In Progress") summary.inProgress = row.count;
    if (row._id === "Resolved") summary.resolved = row.count;
    if (row._id === "Closed") summary.closed = row.count;
  });

  res.json({
    complaints,
    total,
    page: safePage,
    pages: Math.ceil(total / safeLimit) || 1,
    summary,
    supportUsers,
  });
});

// @desc    Get complaint by id
// @route   GET /api/complaints/:id
// @access  Private
export const getComplaintById = asyncHandler(async (req, res) => {
  try {
    const complaint = await ensureComplaintAccess(req, req.params.id);
    res.json(complaint);
  } catch (error) {
    res.status(error.message === "Forbidden" ? 403 : 404);
    throw error;
  }
});

// @desc    Get complaint timeline
// @route   GET /api/complaints/:id/activity
// @access  Private
export const getComplaintActivity = asyncHandler(async (req, res) => {
  try {
    await ensureComplaintAccess(req, req.params.id);
  } catch (error) {
    res.status(error.message === "Forbidden" ? 403 : 404);
    throw error;
  }

  const timeline = await Activity.find({
    entityType: "complaint",
    entityId: req.params.id,
  })
    .populate("userId", "name email role")
    .sort({ createdAt: -1 });

  res.json(timeline);
});

// @desc    Update complaint
// @route   PUT /api/complaints/:id
// @access  Private/Admin|Salesperson
export const updateComplaint = asyncHandler(async (req, res) => {
  if (!canManageComplaint(req.user.role)) {
    res.status(403);
    throw new Error("Forbidden");
  }

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    res.status(404);
    throw new Error("Complaint not found");
  }

  const previousStatus = complaint.status;
  const previousAssignee = complaint.assignedTo?.toString();
  const { status, assignedTo, resolutionNote, priority } = req.body;

  if (status !== undefined) {
    validateStatusTransition(complaint.status, status);
    complaint.status = status;
  }

  if (priority !== undefined) {
    complaint.priority = priority;
  }

  if (assignedTo !== undefined) {
    if (assignedTo) {
      const assignee = await User.findById(assignedTo).select("_id name role");
      if (!assignee || !["admin", "salesperson"].includes(assignee.role)) {
        res.status(400);
        throw new Error("Assigned user must be an admin or support staff");
      }
      complaint.assignedTo = assignee._id;
    } else {
      complaint.assignedTo = null;
    }
  }

  if (resolutionNote !== undefined) {
    complaint.resolutionNote = resolutionNote?.trim() || "";
  }

  const updatedComplaint = await complaint.save();

  if (status && status !== previousStatus) {
    await logActivity({
      type: "complaint",
      entityType: "complaint",
      entityId: complaint._id,
      message: `Complaint status changed from ${previousStatus} to ${status}`,
      user: req.user._id,
      metadata: {
        previousStatus,
        nextStatus: status,
      },
    });
  }

  if (assignedTo !== undefined && `${updatedComplaint.assignedTo || ""}` !== `${previousAssignee || ""}`) {
    await logActivity({
      type: "complaint",
      entityType: "complaint",
      entityId: complaint._id,
      message: updatedComplaint.assignedTo ? "Complaint assigned to support" : "Complaint assignment cleared",
      user: req.user._id,
      metadata: {
        assignedTo: updatedComplaint.assignedTo || null,
      },
    });
  }

  if (resolutionNote !== undefined && updatedComplaint.resolutionNote) {
    await logActivity({
      type: "complaint",
      entityType: "complaint",
      entityId: complaint._id,
      message: "Resolution note updated",
      user: req.user._id,
      metadata: {
        status: updatedComplaint.status,
      },
    });
  }

  res.json(await normalizeComplaint(updatedComplaint));
});

// @desc    Delete complaint
// @route   DELETE /api/complaints/:id
// @access  Private/Admin
export const deleteComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    res.status(404);
    throw new Error("Complaint not found");
  }

  await Promise.all([
    Complaint.findByIdAndDelete(complaint._id),
    Activity.deleteMany({ entityType: "complaint", entityId: complaint._id }),
    logActivity({
      type: "complaint",
      entityType: "complaint",
      entityId: complaint._id,
      message: `Complaint deleted: ${complaint.subject}`,
      user: req.user._id,
      metadata: {
        dealerId: complaint.dealerId,
      },
    }),
  ]);

  res.json({ message: "Complaint removed" });
});
