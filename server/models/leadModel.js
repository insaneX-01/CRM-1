import mongoose from "mongoose";

const leadSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Lead name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    area: {
      type: String,
      required: [true, "Area is required"],
      trim: true,
    },
    requirement: {
      type: String,
      trim: true,
      default: "",
    },
    lostReason: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["New", "Contacted", "Converted", "Lost"],
      default: "New",
    },
    assignedSales: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedDealer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

leadSchema.index({ phone: 1 });
leadSchema.index({ area: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ assignedDealer: 1, status: 1 });
leadSchema.index({ assignedSales: 1, status: 1 });

const Lead = mongoose.model("Lead", leadSchema);

export default Lead;
