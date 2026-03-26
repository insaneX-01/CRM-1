import express from "express";

import {
  createPayment,
  getDealerLedger,
  getPaymentById,
  getPayments,
} from "../controllers/paymentController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/").get(getPayments).post(createPayment);
router.get("/ledger/:dealerId", getDealerLedger);
router.get("/:id", getPaymentById);

export default router;
