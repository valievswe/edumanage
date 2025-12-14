"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/server/routes/admin.routes.ts
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const auth_middleare_1 = require("../middleware/auth.middleare");
const router = (0, express_1.Router)();
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
router.post("/register", admin_controller_1.registerAdmin);
/**
 * POST /api/admin/login
 * @summary Login with admin credentials
 * @tags Admin
 * @param {AdminLoginRequest} request.body.required - Login data
 * @return {object} 200 - JWT token and admin info
 * @return {object} 404 - Admin not found
 */
router.post("/login", admin_controller_1.loginAdmin);
/**
 * GET /api/admin/profile
 * @summary Get the authenticated admin profile
 * @tags Admin
 * @param {string} Authorization.header.required - Bearer access token
 * @return {object} 200 - Authenticated admin info
 * @return {object} 401 - Invalid or missing token
 */
router.get("/profile", auth_middleare_1.verifyAdmin, admin_controller_1.getProfile);
exports.default = router;
