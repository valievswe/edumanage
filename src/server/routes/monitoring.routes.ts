import { Router } from "express";
import {
  getMonitorings,
  getMonitoringById,
  createMonitoring,
  updateMonitoring,
  deleteMonitoring,
} from "../controllers/monitoring.controller";
import { verifyAdmin } from "../middleware/auth.middleare";

const router = Router();

router.get("/", verifyAdmin, getMonitorings);
router.get("/:id", verifyAdmin, getMonitoringById);
router.post("/", verifyAdmin, createMonitoring);
router.put("/:id", verifyAdmin, updateMonitoring);
router.delete("/:id", verifyAdmin, deleteMonitoring);

export default router;
