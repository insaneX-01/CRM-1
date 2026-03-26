import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

import Complaint from "../models/complaintModel.js";
import Dealer from "../models/dealerModel.js";
import Lead from "../models/leadModel.js";
import Order from "../models/orderModel.js";
import Payment from "../models/paymentModel.js";

const LEAD_STATUSES = ["New", "Contacted", "Converted", "Lost"];

const toObjectId = (value) => new mongoose.Types.ObjectId(value);

const parseDateRange = (query) => {
  if (!query.startDate && !query.endDate) {
    return null;
  }

  const now = new Date();
  const start = query.startDate ? new Date(query.startDate) : new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const end = query.endDate ? new Date(query.endDate) : now;

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const buildDefaultChartRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const buildPeriodDateRange = (days, offsetDays = 0) => {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  end.setDate(end.getDate() - offsetDays);

  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);

  return { start, end };
};

const calculateGrowth = (current, previous) => {
  if (!previous && !current) return 0;
  if (!previous) return 100;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

const getScope = async (req) => {
  const { role, _id, area: userArea } = req.user;
  const filters = {
    leadMatch: {},
    orderMatch: {},
    paymentMatch: {},
    complaintMatch: {},
    dealerMatch: {},
  };

  let dealer = null;

  if (role === "dealer") {
    dealer = await Dealer.findOne({ userId: _id }).select("_id area");
    if (!dealer) {
      throw new Error("Dealer not found");
    }

    filters.leadMatch.assignedDealer = dealer._id;
    filters.orderMatch.dealerId = dealer._id;
    filters.paymentMatch.dealerId = dealer._id;
    filters.complaintMatch.dealerId = dealer._id;
    filters.dealerMatch._id = dealer._id;
  }

  if (role === "salesperson") {
    filters.leadMatch.createdBy = _id;
    filters.complaintMatch.createdBy = _id;

    const salespersonLeads = await Lead.find({ createdBy: _id }).select("_id assignedDealer");
    const leadIds = salespersonLeads.map((lead) => lead._id);
    const dealerIds = salespersonLeads
      .map((lead) => lead.assignedDealer)
      .filter(Boolean);

    const salespersonOrders = await Order.find({ leadId: { $in: leadIds } }).select("_id");
    const orderIds = salespersonOrders.map((order) => order._id);

    filters.orderMatch.leadId = { $in: leadIds };
    filters.paymentMatch.orderId = { $in: orderIds };
    filters.dealerMatch._id = { $in: dealerIds };
  }

  const area = req.query.area || userArea;
  if (area) {
    filters.leadMatch.area = area;
    filters.dealerMatch.area = area;
  }

  if (req.query.dealerId && role === "admin") {
    if (!mongoose.Types.ObjectId.isValid(req.query.dealerId)) {
      throw new Error("Invalid dealer filter");
    }

    const dealerId = toObjectId(req.query.dealerId);
    filters.leadMatch.assignedDealer = dealerId;
    filters.orderMatch.dealerId = dealerId;
    filters.paymentMatch.dealerId = dealerId;
    filters.complaintMatch.dealerId = dealerId;
    filters.dealerMatch._id = dealerId;
  }

  return { filters, dealer };
};

const withCreatedAtRange = (match, range) => {
  if (!range) return { ...match };
  return {
    ...match,
    createdAt: {
      $gte: range.start,
      $lte: range.end,
    },
  };
};

const withPaidAtRange = (match, range) => {
  if (!range) return { ...match };
  return {
    ...match,
    paymentDate: {
      $gte: range.start,
      $lte: range.end,
    },
  };
};

const aggregateRevenue = async (match) => {
  const [result] = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        value: { $sum: "$totalAmount" },
      },
    },
  ]);

  return result?.value || 0;
};

const aggregatePayments = async (match) => {
  const [result] = await Payment.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        value: { $sum: "$amountPaid" },
      },
    },
  ]);

  return result?.value || 0;
};

const getStatsInternal = async (req) => {
  const { filters } = await getScope(req);
  const activeRange = parseDateRange(req.query);
  if (req.query.startDate || req.query.endDate) {
    if (!activeRange) {
      return { error: "Invalid date range supplied" };
    }
  }

  const currentRange = activeRange || buildPeriodDateRange(30, 0);
  const rangeLengthDays =
    Math.ceil((currentRange.end.getTime() - currentRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const previousRange = buildPeriodDateRange(rangeLengthDays, rangeLengthDays);

  const [
    totalDealers,
    totalLeads,
    totalOrders,
    totalComplaints,
    leadStatusRows,
    revenue,
    totalPaid,
    currentLeadCount,
    previousLeadCount,
    currentRevenue,
    previousRevenue,
    currentOrderCount,
    previousOrderCount,
    currentDealerCount,
    previousDealerCount,
    currentPaid,
    previousPaid,
  ] = await Promise.all([
    Dealer.countDocuments(filters.dealerMatch),
    Lead.countDocuments(withCreatedAtRange(filters.leadMatch, activeRange)),
    Order.countDocuments(withCreatedAtRange(filters.orderMatch, activeRange)),
    Complaint.countDocuments(withCreatedAtRange(filters.complaintMatch, activeRange)),
    Lead.aggregate([
      { $match: withCreatedAtRange(filters.leadMatch, activeRange) },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    aggregateRevenue(withCreatedAtRange(filters.orderMatch, activeRange)),
    aggregatePayments(withPaidAtRange(filters.paymentMatch, activeRange)),
    Lead.countDocuments(withCreatedAtRange(filters.leadMatch, currentRange)),
    Lead.countDocuments(withCreatedAtRange(filters.leadMatch, previousRange)),
    aggregateRevenue(withCreatedAtRange(filters.orderMatch, currentRange)),
    aggregateRevenue(withCreatedAtRange(filters.orderMatch, previousRange)),
    Order.countDocuments(withCreatedAtRange(filters.orderMatch, currentRange)),
    Order.countDocuments(withCreatedAtRange(filters.orderMatch, previousRange)),
    Dealer.countDocuments(withCreatedAtRange(filters.dealerMatch, currentRange)),
    Dealer.countDocuments(withCreatedAtRange(filters.dealerMatch, previousRange)),
    aggregatePayments(withPaidAtRange(filters.paymentMatch, currentRange)),
    aggregatePayments(withPaidAtRange(filters.paymentMatch, previousRange)),
  ]);

  const leadsByStatus = LEAD_STATUSES.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});

  leadStatusRows.forEach((row) => {
    leadsByStatus[row._id] = row.count;
  });

  const outstanding = Math.max(revenue - totalPaid, 0);
  const currentOutstanding = Math.max(currentRevenue - currentPaid, 0);
  const previousOutstanding = Math.max(previousRevenue - previousPaid, 0);

  return {
    totalDealers,
    totalLeads,
    leadsByStatus,
    totalOrders,
    totalRevenue: revenue,
    revenue,
    outstanding,
    totalComplaints,
    growth: {
      dealers: calculateGrowth(currentDealerCount, previousDealerCount),
      leads: calculateGrowth(currentLeadCount, previousLeadCount),
      orders: calculateGrowth(currentOrderCount, previousOrderCount),
      revenue: calculateGrowth(currentRevenue, previousRevenue),
      outstanding: calculateGrowth(currentOutstanding, previousOutstanding),
    },
  };
};

export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await getStatsInternal(req);
  if (stats.error) {
    res.status(400);
    throw new Error(stats.error);
  }

  res.json(stats);
});

export const getDashboardCharts = asyncHandler(async (req, res) => {
  const { filters } = await getScope(req);
  const activeRange = parseDateRange(req.query);
  if (req.query.startDate || req.query.endDate) {
    if (!activeRange) {
      res.status(400);
      throw new Error("Invalid date range supplied");
    }
  }

  const chartRange = activeRange || buildDefaultChartRange();
  const baseLeadMatch = withCreatedAtRange(filters.leadMatch, chartRange);
  const baseOrderMatch = withCreatedAtRange(filters.orderMatch, chartRange);

  const [leadStatusRows, monthlySalesRows, dealerPerformanceRows, complaintRows] = await Promise.all([
    Lead.aggregate([
      { $match: baseLeadMatch },
      { $group: { _id: "$status", value: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: baseOrderMatch },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          orders: { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    Lead.aggregate([
      { $match: baseLeadMatch },
      { $match: { assignedDealer: { $ne: null } } },
      {
        $lookup: {
          from: "dealers",
          localField: "assignedDealer",
          foreignField: "_id",
          as: "dealer",
        },
      },
      { $unwind: "$dealer" },
      {
        $group: {
          _id: "$assignedDealer",
          dealer: { $first: "$dealer.name" },
          area: { $first: "$dealer.area" },
          totalLeads: { $sum: 1 },
          conversions: {
            $sum: {
              $cond: [{ $eq: ["$status", "Converted"] }, 1, 0],
            },
          },
        },
      },
      {
        $addFields: {
          conversionRate: {
            $cond: [
              { $gt: ["$totalLeads", 0] },
              {
                $multiply: [{ $divide: ["$conversions", "$totalLeads"] }, 100],
              },
              0,
            ],
          },
        },
      },
      { $sort: { conversions: -1, conversionRate: -1 } },
      { $limit: 5 },
    ]),
    Complaint.aggregate([
      { $match: withCreatedAtRange(filters.complaintMatch, chartRange) },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const leadsStatusDistribution = LEAD_STATUSES.map((status) => ({
    name: status,
    value: leadStatusRows.find((row) => row._id === status)?.value || 0,
  }));

  const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" });
  const monthlySales = monthlySalesRows.map((row) => ({
    month: monthFormatter.format(new Date(row._id.year, row._id.month - 1, 1)),
    orders: row.orders,
    revenue: row.revenue,
  }));

  const dealerPerformance = dealerPerformanceRows.map((row) => ({
    dealer: row.dealer,
    area: row.area,
    conversions: row.conversions,
    totalLeads: row.totalLeads,
    conversionRate: Number(row.conversionRate.toFixed(1)),
  }));

  const notifications = complaintRows
    .filter((row) => row._id === "Open" || row._id === "In Progress")
    .map((row) => ({
      id: row._id,
      message: `${row.count} complaint${row.count > 1 ? "s" : ""} ${row._id.toLowerCase()}`,
      variant: row._id === "Open" ? "warning" : "info",
    }));

  res.json({
    leadsStatusDistribution,
    monthlySales,
    dealerPerformance,
    notifications,
  });
});

export const getDashboardActivity = asyncHandler(async (req, res) => {
  const { filters } = await getScope(req);
  const activeRange = parseDateRange(req.query);
  if (req.query.startDate || req.query.endDate) {
    if (!activeRange) {
      res.status(400);
      throw new Error("Invalid date range supplied");
    }
  }

  const limit = Math.min(Number(req.query.limit) || 12, 30);

  const [leads, orders, payments, complaints] = await Promise.all([
    Lead.find(withCreatedAtRange(filters.leadMatch, activeRange))
      .populate("assignedDealer", "name")
      .sort({ createdAt: -1 })
      .limit(limit),
    Order.find(withCreatedAtRange(filters.orderMatch, activeRange))
      .populate("dealerId", "name")
      .populate("leadId", "name")
      .sort({ createdAt: -1 })
      .limit(limit),
    Payment.find(withPaidAtRange(filters.paymentMatch, activeRange))
      .populate("dealerId", "name")
      .populate("orderId", "products")
      .sort({ paymentDate: -1 })
      .limit(limit),
    Complaint.find(withCreatedAtRange(filters.complaintMatch, activeRange))
      .populate("dealerId", "name")
      .sort({ createdAt: -1 })
      .limit(limit),
  ]);

  const activities = [
    ...leads.map((lead) => ({
      id: `lead-${lead._id}`,
      type: "lead",
      title: `${lead.name} lead created`,
      subtitle: `${lead.phone} - ${lead.area}`,
      meta: lead.assignedDealer?.name || "Unassigned",
      status: lead.status,
      amount: null,
      timestamp: lead.createdAt,
    })),
    ...orders.map((order) => ({
      id: `order-${order._id}`,
      type: "order",
      title: `${order.products?.[0]?.productName || "Order"} order placed`,
      subtitle: order.leadId?.name || "Lead linked",
      meta: order.dealerId?.name || "Dealer",
      status: order.status,
      amount: order.totalAmount,
      timestamp: order.createdAt,
    })),
    ...payments.map((payment) => ({
      id: `payment-${payment._id}`,
      type: "payment",
      title: `Payment received from ${payment.dealerId?.name || "dealer"}`,
      subtitle: payment.orderId?.products?.[0]?.productName || payment.paymentMethod,
      meta: payment.paymentMethod,
      status: "Paid",
      amount: payment.amountPaid,
      timestamp: payment.paymentDate,
    })),
    ...complaints.map((complaint) => ({
      id: `complaint-${complaint._id}`,
      type: "complaint",
      title: complaint.subject,
      subtitle: complaint.description,
      meta: complaint.dealerId?.name || "Dealer",
      status: complaint.status,
      amount: null,
      timestamp: complaint.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);

  res.json(activities);
});

export const exportDashboardData = asyncHandler(async (req, res) => {
  const stats = await getStatsInternal(req);
  if (stats.error) {
    res.status(400);
    throw new Error(stats.error);
  }

  const { filters } = await getScope(req);
  const activeRange = parseDateRange(req.query);
  const activityLimit = 10;

  const [activities, dealerRows] = await Promise.all([
    Lead.find(withCreatedAtRange(filters.leadMatch, activeRange)).sort({ createdAt: -1 }).limit(activityLimit),
    Dealer.find(filters.dealerMatch).select("name area"),
  ]);

  const lines = [
    ["Metric", "Value"],
    ["Total Dealers", stats.totalDealers],
    ["Total Leads", stats.totalLeads],
    ["Total Orders", stats.totalOrders],
    ["Total Revenue", stats.totalRevenue],
    ["Outstanding Payments", stats.outstanding],
    ["New Leads", stats.leadsByStatus.New],
    ["Contacted Leads", stats.leadsByStatus.Contacted],
    ["Converted Leads", stats.leadsByStatus.Converted],
    ["Lost Leads", stats.leadsByStatus.Lost],
    [],
    ["Dealers", "Area"],
    ...dealerRows.map((dealer) => [dealer.name, dealer.area]),
    [],
    ["Recent Leads", "Area", "Status"],
    ...activities.map((lead) => [lead.name, lead.area, lead.status]),
  ];

  const csv = lines
    .map((line) =>
      line
        .map((value = "") => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="dashboard-export.csv"');
  res.send(csv);
});
