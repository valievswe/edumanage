"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const quarter_controller_1 = require("../controllers/quarter.controller");
const auth_middleare_1 = require("../middleware/auth.middleare");
const router = (0, express_1.Router)();
/**
 * Quarter payload
 * @typedef {object} QuarterRequest
 * @property {string} name.required - Quarter label, e.g. "Q1"
 * @property {number} studyYearId.required - Related study year ID
 * @property {string} startDate - Start ISO date
 * @property {string} endDate - End ISO date
 */
/**
 * GET /api/quarters
 * @summary List quarters with their study year
 * @tags Quarters
 * @param {string} Authorization.header.required - Bearer access token
 * @return {array<object>} 200 - Quarters list
 */
router.get("/", auth_middleare_1.verifyAdmin, quarter_controller_1.getQuarters);
/**
 * POST /api/quarters
 * @summary Create a quarter
 * @tags Quarters
 * @param {string} Authorization.header.required - Bearer access token
 * @param {QuarterRequest} request.body.required - Quarter info
 * @return {object} 201 - Created quarter
 * @return {object} 400 - Missing name or studyYearId
 */
router.post("/", auth_middleare_1.verifyAdmin, quarter_controller_1.createQuarter);
/**
 * DELETE /api/quarters/{id}
 * @summary Delete a quarter
 * @tags Quarters
 * @param {string} Authorization.header.required - Bearer access token
 * @param {number} id.path.required - Quarter ID
 * @return {object} 200 - Delete confirmation
 */
router.delete("/:id", auth_middleare_1.verifyAdmin, quarter_controller_1.deleteQuarter);
exports.default = router;
