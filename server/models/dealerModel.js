import mongoose from "mongoose";

const dealerSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Dealer name is required"],
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      alias: "user",
    },
    businessName: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    gstNumber: {
      type: String,
      trim: true,
      default: "",
    },
    area: {
      type: String,
      trim: true,
      required: [true, "Area is required"],
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    role: {
      type: String,
      enum: ["dealer"],
      default: "dealer",
    },
    performance: {
      totalLeads: { type: Number, default: 0 },
      convertedLeads: { type: Number, default: 0 },
      totalOrders: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
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

dealerSchema.index({ area: 1 });
dealerSchema.index({ phone: 1 }, { unique: true });
dealerSchema.index({ email: 1 }, { unique: true });

const Dealer = mongoose.model("Dealer", dealerSchema);

export default Dealer;
