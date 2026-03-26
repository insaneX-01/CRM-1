import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";
import Dealer from "../models/dealerModel.js";
import SalesProfile from "../models/salesProfileModel.js";
import generateToken from "../utils/generateToken.js";
import { normalizePhone, provisionLinkedProfile } from "../utils/provisionUserProfile.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeEmail = (email = "") => email.trim().toLowerCase();

const ensureLoginAllowed = (user) => {
  if (!user || user.isActive === false || user.status === "Inactive") {
    throw new Error("Your account is inactive");
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    role,
    area,
    phone = "",
    businessName = "",
    address = "",
    gstNumber = "",
  } = req.body;

  const normalizedEmail = normalizeEmail(email);
  const normalizedRole = ["dealer", "salesperson"].includes(role) ? role : "dealer";
  const normalizedPhone = normalizePhone(phone);

  if (!name?.trim()) {
    res.status(400);
    throw new Error("Name is required");
  }

  if (!emailPattern.test(normalizedEmail)) {
    res.status(400);
    throw new Error("Valid email is required");
  }

  if (!password || String(password).length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters");
  }

  if (!/^[0-9]{10,15}$/.test(normalizedPhone)) {
    res.status(400);
    throw new Error("Valid phone number is required");
  }

  if (normalizedRole === "dealer" && !businessName?.trim()) {
    res.status(400);
    throw new Error("Business name is required for dealer registration");
  }

  if (normalizedRole === "dealer" && !address?.trim()) {
    res.status(400);
    throw new Error("Address is required for dealer registration");
  }

  const userExists = await User.findOne({ email: normalizedEmail });
  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  let user;
  try {
    user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password,
      role: normalizedRole,
      area: area?.trim() || "",
    });

    await provisionLinkedProfile({
      user,
      role: normalizedRole,
      payload: {
        phone: normalizedPhone,
        area,
        businessName,
        address,
        gstNumber,
        assignedAreas: area,
      },
      actorId: user._id,
    });
  } catch (error) {
    if (user?._id) {
      await User.findByIdAndDelete(user._id);
    }
    throw error;
  }

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      area: user.area,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: normalizeEmail(email) });

  if (user) {
    ensureLoginAllowed(user);
  }

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      area: user.area,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

// @desc    Authenticate dealer & get token
// @route   POST /api/auth/dealer-login
// @access  Public
export const authDealer = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: normalizeEmail(email) });

  if (user) {
    ensureLoginAllowed(user);
  }

  if (!user || user.role !== "dealer" || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid dealer credentials");
  }

  const dealer = await Dealer.findOne({ userId: user._id }).select(
    "name businessName phone email area address gstNumber status role rating performance"
  );

  if (!dealer) {
    res.status(404);
    throw new Error("Dealer profile not found");
  }

  res.json({
    token: generateToken(user._id),
    dealer: {
      _id: dealer._id,
      name: dealer.name,
      businessName: dealer.businessName,
      phone: dealer.phone,
      email: dealer.email,
      area: dealer.area,
      address: dealer.address,
      gstNumber: dealer.gstNumber,
      status: dealer.status,
      role: dealer.role,
      rating: dealer.rating,
      performance: dealer.performance,
    },
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      area: user.area,
    },
  });
});

// @desc    Authenticate sales user & get token
// @route   POST /api/auth/sales-login
// @access  Public
export const authSales = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: normalizeEmail(email) });

  if (user) {
    ensureLoginAllowed(user);
  }

  if (!user || user.role !== "salesperson" || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid sales credentials");
  }

  const profile = await SalesProfile.findOne({ userId: user._id }).select(
    "phone assignedAreas assignedLeads status createdBy"
  );

  if (!profile) {
    res.status(404);
    throw new Error("Sales profile not found");
  }

  res.json({
    token: generateToken(user._id),
    salesUser: {
      _id: profile._id,
      userId: user._id,
      name: user.name,
      email: user.email,
      phone: profile.phone || user.phone,
      role: user.role,
      assignedAreas: profile.assignedAreas,
      assignedLeads: profile.assignedLeads,
      status: profile.status,
    },
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      area: user.area,
      status: user.status,
    },
  });
});

// @desc    Get logged in user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      area: user.area,
      isActive: user.isActive,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Update logged in user's profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const { name, email, password, area, phone } = req.body;

  if (email !== undefined) {
    const normalizedEmail = normalizeEmail(email);
    if (!emailPattern.test(normalizedEmail)) {
      res.status(400);
      throw new Error("Valid email is required");
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: user._id },
    });

    if (existingUser) {
      res.status(409);
      throw new Error("Email already in use");
    }

    user.email = normalizedEmail;
  }

  if (name !== undefined) user.name = name.trim() || user.name;
  if (area !== undefined) user.area = area.trim();
  if (phone !== undefined) user.phone = phone.trim();

  if (password) {
    if (String(password).length < 6) {
      res.status(400);
      throw new Error("Password must be at least 6 characters");
    }
    user.password = password;
  }

  const updatedUser = await user.save();

  res.json({
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    phone: updatedUser.phone,
    role: updatedUser.role,
    area: updatedUser.area,
    token: generateToken(updatedUser._id),
  });
});
