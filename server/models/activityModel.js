import mongoose from "mongoose";

const activitySchema = mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true,
      enum: ["lead", "order", "dealer", "payment", "complaint", "lead_update", "dealer_action"],
    },
    entityType: {
      type: String,
      required: true,
      trim: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      alias: "user",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

activitySchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
activitySchema.index({ type: 1, createdAt: -1 });

const Activity = mongoose.model("Activity", activitySchema);

export default Activity;
