import { Router } from "express";
import { verifyAdmin } from "../middleware/auth.middleare";
import {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentMarks,
} from "../controllers/student.controller";

const router = Router();

// ---- PUBLIC ROUTES (for parents / bot) ----
router.get("/:id/marks", getStudentMarks); // no verifyAdmin
router.get("/:id", getStudentById);        // no verifyAdmin

// ---- ADMIN ROUTES ----
router.get("/", verifyAdmin, getStudents);
router.post("/", verifyAdmin, createStudent);
router.put("/:id", verifyAdmin, updateStudent);
router.delete("/:id", verifyAdmin, deleteStudent);

export default router;
