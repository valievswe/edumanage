import { Router } from "express";
import {
  getQuarters,
  createQuarter,
  deleteQuarter,
} from "../controllers/quarter.controller";
import { verifyAdmin } from "../middleware/auth.middleare";

const router = Router();

router.get("/", verifyAdmin, getQuarters);
router.post("/", verifyAdmin, createQuarter);
router.delete("/:id", verifyAdmin, deleteQuarter);

export default router;
