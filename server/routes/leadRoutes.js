import express from "express";
import {
  addLeadNote,
  assignLead,
  assignLeadToSales,
  createLead,
  deleteLead,
  exportLeads,
  getLeadActivity,
  getLeadById,
  getLeadNotes,
  getLeads,
  updateLead,
  updateLeadStatus,
} from "../controllers/leadController.js";
import { authorize, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/").post(authorize("admin", "salesperson"), createLead).get(getLeads);
router.get("/export", exportLeads);
router.get("/:id/activity", getLeadActivity);
router.route("/:id/notes").get(getLeadNotes).post(authorize("admin", "salesperson"), addLeadNote);
router.patch("/:id/status", updateLeadStatus);
router.route("/:id").get(getLeadById).put(updateLead).delete(authorize("admin"), deleteLead);
router.put("/:id/assign", authorize("admin"), assignLead);
router.put("/:id/assign-sales", authorize("admin"), assignLeadToSales);

export default router;
