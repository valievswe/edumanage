// src/server/routes/admin.routes.ts
import { Router } from "express";
import { registerAdmin, loginAdmin, getProfile } from "../controllers/admin.controller";
import { verifyAdmin } from "../middleware/auth.middleare";

const router = Router();

router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.get("/profile", verifyAdmin, getProfile);

export default router;
