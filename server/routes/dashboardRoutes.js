import express from "express";

import {
  exportDashboardData,
  getDashboardActivity,
  getDashboardCharts,
  getDashboardStats,
} from "../controllers/dashboardController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/stats", getDashboardStats);
router.get("/charts", getDashboardCharts);
router.get("/activity", getDashboardActivity);
router.get("/export", exportDashboardData);

export default router;
