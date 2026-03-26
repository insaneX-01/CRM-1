import mongoose from "mongoose";

const schemeSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Scheme name is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    criteria: {
      type: String,
      default: "",
      trim: true,
    },
    incentiveRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Scheme = mongoose.model("Scheme", schemeSchema);

export default Scheme;
