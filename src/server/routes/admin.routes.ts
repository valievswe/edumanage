// src/server/routes/admin.routes.ts
import { Router } from "express";
import { registerAdmin, loginAdmin, getProfile } from "../controllers/admin.controller";
import { verifyAdmin } from "../middleware/auth.middleare";

const router = Router();

/**
 * Admin registration payload
 * @typedef {object} AdminRegisterRequest
 * @property {string} username.required - Unique username
 * @property {string} email.required - Admin email
 * @property {string} password.required - Minimum 6 characters
 */

/**
 * Admin login payload
 * @typedef {object} AdminLoginRequest
 * @property {string} email.required - Admin email
 * @property {string} password.required - Plain password
 */

/**
 * POST /api/admin/register
 * @summary Create a new admin account
 * @tags Admin
 * @param {AdminRegisterRequest} request.body.required - Admin info
 * @return {object} 201 - Created admin
 * @return {object} 400 - Admin already exists
 */
router.post("/register", registerAdmin);

/**
 * POST /api/admin/login
 * @summary Login with admin credentials
 * @tags Admin
 * @param {AdminLoginRequest} request.body.required - Login data
 * @return {object} 200 - JWT token and admin info
 * @return {object} 404 - Admin not found
 */
router.post("/login", loginAdmin);

/**
 * GET /api/admin/profile
 * @summary Get the authenticated admin profile
 * @tags Admin
 * @param {string} Authorization.header.required - Bearer access token
 * @return {object} 200 - Authenticated admin info
 * @return {object} 401 - Invalid or missing token
 */
router.get("/profile", verifyAdmin, getProfile);

export default router;
