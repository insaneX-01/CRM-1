import express from "express";
import {
  createScheme,
  deleteScheme,
  getSchemes,
  updateScheme,
} from "../controllers/schemeController.js";
import { authorize, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.route("/").get(getSchemes).post(authorize("admin"), createScheme);
router
  .route(":id")
  .put(authorize("admin"), updateScheme)
  .delete(authorize("admin"), deleteScheme);

export default router;
