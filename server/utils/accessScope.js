import Dealer from "../models/dealerModel.js";
import Lead from "../models/leadModel.js";
import Order from "../models/orderModel.js";

export const getDealerForUser = async (userId) => Dealer.findOne({ userId });

export const getAccessibleLeadIdsForSales = async (userId) => {
  const leads = await Lead.find({
    $or: [{ assignedSales: userId }, { createdBy: userId }],
  }).select("_id");

  return leads.map((lead) => lead._id);
};

export const getOrderAccessQueryForUser = async (user) => {
  if (user.role === "admin") {
    return {};
  }

  if (user.role === "dealer") {
    const dealer = await getDealerForUser(user._id);
    return dealer ? { dealerId: dealer._id } : { _id: null };
  }

  if (user.role === "salesperson") {
    const leadIds = await getAccessibleLeadIdsForSales(user._id);

    if (leadIds.length === 0) {
      return { createdBy: user._id };
    }

    return {
      $or: [{ createdBy: user._id }, { leadId: { $in: leadIds } }],
    };
  }

  return { createdBy: user._id };
};

export const getAccessibleOrderIdsForUser = async (user) => {
  const query = await getOrderAccessQueryForUser(user);
  const orders = await Order.find(query).select("_id");
  return orders.map((order) => order._id);
};
