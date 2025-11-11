import { Router } from "express";
import {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} from "../controllers/subject.controller";
import { verifyAdmin } from "../middleware/auth.middleare";

const router = Router();

router.get("/", verifyAdmin, getSubjects);
router.post("/", verifyAdmin, createSubject);
router.put("/:id", verifyAdmin, updateSubject);
router.delete("/:id", verifyAdmin, deleteSubject);

export default router;
