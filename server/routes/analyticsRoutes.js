import express from "express";
import { getDealerSummary, getSummary } from "../controllers/analyticsController.js";
import { authorize, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/summary", authorize("admin"), getSummary);
router.get("/dealer", authorize("dealer"), getDealerSummary);

export default router;
