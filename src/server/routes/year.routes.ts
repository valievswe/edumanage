import { Router } from "express";
import { getYears, createYear, deleteYear, updateYear } from "../controllers/year.controller";
import { verifyAdmin } from "../middleware/auth.middleare";

const router = Router();

router.get("/", getYears);
router.post("/", verifyAdmin, createYear);
router.put("/:id", verifyAdmin, updateYear);
router.delete("/:id", verifyAdmin, deleteYear);

export default router;
