import express from "express";
import {
  authDealer,
  authSales,
  authUser,
  getUserProfile,
  registerUser,
  updateUserProfile,
} from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";
import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";
import { provisionLinkedProfile } from "../utils/provisionUserProfile.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", authUser);
router.post("/dealer-login", authDealer);
router.post("/sales-login", authSales);
router.route("/profile").get(protect, getUserProfile).put(protect, updateUserProfile);

// Development only: Seed test users
router.post("/seed-test-users", asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ message: "Not allowed in production" });
  }

  // Delete existing test users
  await User.deleteMany({ email: { $in: ["admin@techfanatics.com", "dealer@techfanatics.com"] } });

  // Create admin user
  const admin = await User.create({
    name: "Admin User",
    email: "admin@techfanatics.com",
    password: "Admin@123",
    role: "admin",
  });

  // Create dealer user
  const dealer = await User.create({
    name: "Dealer User",
    email: "dealer@techfanatics.com",
    phone: "9876543210",
    password: "Dealer@123",
    role: "dealer",
    area: "North",
  });

  await provisionLinkedProfile({
    user: dealer,
    role: "dealer",
    payload: {
      phone: dealer.phone,
      area: dealer.area,
      businessName: "North Region Dealer",
      address: "North Region Office",
    },
    actorId: admin._id,
  });

  res.status(201).json({
    message: "Test users created successfully!",
    admin: { email: admin.email, password: "Admin@123" },
    dealer: { email: dealer.email, password: "Dealer@123" },
  });
}));

export default router;
