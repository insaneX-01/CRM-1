import express from "express";
import {
  createOrder,
  deleteOrder,
  getOrderById,
  getOrders,
  updateOrder,
} from "../controllers/orderController.js";
import { authorize, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.route("/").get(getOrders).post(authorize("admin", "salesperson"), createOrder);
router
  .route("/:id")
  .get(getOrderById)
  .put(authorize("admin", "salesperson"), updateOrder)
  .delete(authorize("admin"), deleteOrder);

export default router;
