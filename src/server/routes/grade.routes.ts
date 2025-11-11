import { Router } from "express";
import {
  getGrades,
  createGrade,
  updateGrade,
  deleteGrade,
} from "../controllers/grade.controller";
import { verifyAdmin } from "../middleware/auth.middleare";

const router = Router();

router.get("/", verifyAdmin, getGrades);
router.post("/", verifyAdmin, createGrade);
router.put("/:id", verifyAdmin, updateGrade);
router.delete("/:id", verifyAdmin, deleteGrade);

export default router;
