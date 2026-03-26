import mongoose from "mongoose";

const salesProfileSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    assignedAreas: {
      type: [String],
      default: [],
    },
    assignedLeads: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lead",
      },
    ],
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
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

salesProfileSchema.index({ assignedAreas: 1 });
salesProfileSchema.index({ status: 1, createdAt: -1 });

const SalesProfile = mongoose.model("SalesProfile", salesProfileSchema);

export default SalesProfile;
