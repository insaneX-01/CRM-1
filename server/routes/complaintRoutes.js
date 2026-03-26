import express from "express";

import {
  createComplaint,
  deleteComplaint,
  getComplaintActivity,
  getComplaintById,
  getComplaints,
  updateComplaint,
} from "../controllers/complaintController.js";
import { authorize, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/").get(getComplaints).post(authorize("dealer"), createComplaint);
router.route("/:id").get(getComplaintById).put(authorize("admin", "salesperson"), updateComplaint).delete(authorize("admin"), deleteComplaint);
router.get("/:id/activity", getComplaintActivity);

export default router;
