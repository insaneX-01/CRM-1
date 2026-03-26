import mongoose from "mongoose";

const leadNoteSchema = mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
    salesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    note: {
      type: String,
      required: [true, "Note is required"],
      trim: true,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
  }
);

leadNoteSchema.index({ leadId: 1, createdAt: -1 });
leadNoteSchema.index({ salesId: 1, createdAt: -1 });

const LeadNote = mongoose.model("LeadNote", leadNoteSchema);

export default LeadNote;
