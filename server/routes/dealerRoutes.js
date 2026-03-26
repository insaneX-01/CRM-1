import express from "express";
import {
  createDealer,
  deleteDealer,
  exportDealers,
  getDealerById,
  getDealerPerformance,
  getDealers,
  getDealerSummary,
  getMyDealerProfile,
  updateDealer,
} from "../controllers/dealerController.js";
import { authorize, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/profile/me", authorize("dealer"), getMyDealerProfile);
router.get("/export", authorize("admin"), exportDealers);
router.get("/", authorize("admin"), getDealers);
router.post("/", authorize("admin"), createDealer);
router.get("/:id/performance", getDealerPerformance);
router.get("/:id/summary", getDealerSummary);
router
  .route("/:id")
  .get(getDealerById)
  .put(authorize("admin"), updateDealer)
  .delete(authorize("admin"), deleteDealer);

export default router;
