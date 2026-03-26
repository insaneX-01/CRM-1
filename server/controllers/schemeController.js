import asyncHandler from "express-async-handler";
import Scheme from "../models/schemeModel.js";

// @desc    Create scheme
// @route   POST /api/schemes
// @access  Private/Admin
export const createScheme = asyncHandler(async (req, res) => {
  const { name, description, criteria, incentiveRate, active } = req.body;

  const scheme = await Scheme.create({
    name,
    description,
    criteria,
    incentiveRate,
    active: active ?? true,
  });

  res.status(201).json(scheme);
});

// @desc    Get all schemes
// @route   GET /api/schemes
// @access  Private
export const getSchemes = asyncHandler(async (req, res) => {
  const schemes = await Scheme.find().sort({ createdAt: -1 });
  res.json(schemes);
});

// @desc    Update scheme
// @route   PUT /api/schemes/:id
// @access  Private/Admin
export const updateScheme = asyncHandler(async (req, res) => {
  const scheme = await Scheme.findById(req.params.id);

  if (!scheme) {
    res.status(404);
    throw new Error("Scheme not found");
  }

  const { name, description, criteria, incentiveRate, active } = req.body;

  scheme.name = name || scheme.name;
  scheme.description = description || scheme.description;
  scheme.criteria = criteria || scheme.criteria;
  scheme.incentiveRate = incentiveRate ?? scheme.incentiveRate;
  scheme.active = active ?? scheme.active;

  const updated = await scheme.save();
  res.json(updated);
});

// @desc    Delete scheme
// @route   DELETE /api/schemes/:id
// @access  Private/Admin
export const deleteScheme = asyncHandler(async (req, res) => {
  const scheme = await Scheme.findById(req.params.id);

  if (!scheme) {
    res.status(404);
    throw new Error("Scheme not found");
  }

  await scheme.remove();
  res.json({ message: "Scheme removed" });
});
