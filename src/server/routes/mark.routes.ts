import { Router } from "express";
import {
  getMarks,
  getMarkById,
  createMark,
  updateMark,
  deleteMark,
  upsertBulkMarks,
} from "../controllers/mark.controller";
import { verifyAdmin } from "../middleware/auth.middleare";

const router = Router();

// Admin-only routes
router.get("/", verifyAdmin, getMarks);
router.get("/:id", verifyAdmin, getMarkById);
router.post("/", verifyAdmin, createMark);
router.post("/bulk", verifyAdmin, upsertBulkMarks);
router.put("/:id", verifyAdmin, updateMark);
router.delete("/:id", verifyAdmin, deleteMark);

export default router;
