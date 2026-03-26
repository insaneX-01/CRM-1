import express from "express";

import {
  createSalesUser,
  deleteSalesUser,
  getMySalesProfile,
  getSalesPerformance,
  getSalesSummary,
  getSalesUserById,
  getSalesUsers,
  updateSalesUser,
} from "../controllers/salesController.js";
import { authorize, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/profile/me", authorize("salesperson"), getMySalesProfile);
router.route("/").get(authorize("admin"), getSalesUsers).post(authorize("admin"), createSalesUser);
router.get("/:id/performance", getSalesPerformance);
router.get("/:id/summary", getSalesSummary);
router.route("/:id").get(getSalesUserById).put(authorize("admin"), updateSalesUser).delete(authorize("admin"), deleteSalesUser);

export default router;
