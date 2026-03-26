import Dealer from "../models/dealerModel.js";
import SalesProfile from "../models/salesProfileModel.js";

const phonePattern = /^[0-9]{10,15}$/;

export const normalizePhone = (phone = "") => String(phone).replace(/\D/g, "");

const normalizeAreas = (areas) =>
  (Array.isArray(areas) ? areas : [areas])
    .flatMap((item) => String(item || "").split(","))
    .map((item) => item.trim())
    .filter(Boolean);

export const provisionLinkedProfile = async ({
  user,
  role,
  payload = {},
  actorId,
}) => {
  if (role === "dealer") {
    const existingDealer = await Dealer.findOne({ userId: user._id });
    if (existingDealer) {
      return existingDealer;
    }

    const normalizedPhone = normalizePhone(payload.phone || user.phone);
    if (!phonePattern.test(normalizedPhone)) {
      throw new Error("Valid phone number is required for dealer registration");
    }

    return Dealer.create({
      name: user.name,
      userId: user._id,
      businessName: payload.businessName?.trim() || user.name,
      phone: normalizedPhone,
      email: user.email,
      address: payload.address?.trim() || `${user.area || "Primary area"} office`,
      area: user.area || payload.area?.trim() || "",
      status: user.status || "Active",
      createdBy: actorId || user._id,
      gstNumber: payload.gstNumber?.trim() || "",
      rating: 0,
      role: "dealer",
    });
  }

  if (role === "salesperson") {
    const existingSalesProfile = await SalesProfile.findOne({ userId: user._id });
    if (existingSalesProfile) {
      return existingSalesProfile;
    }

    const normalizedPhone = normalizePhone(payload.phone || user.phone);
    if (!phonePattern.test(normalizedPhone)) {
      throw new Error("Valid phone number is required for sales registration");
    }

    return SalesProfile.create({
      userId: user._id,
      phone: normalizedPhone,
      assignedAreas: normalizeAreas(payload.assignedAreas || payload.area || user.area),
      assignedLeads: [],
      status: user.status || "Active",
      createdBy: actorId || user._id,
    });
  }

  return null;
};
