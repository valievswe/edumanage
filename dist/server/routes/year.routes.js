"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const year_controller_1 = require("../controllers/year.controller");
const auth_middleare_1 = require("../middleware/auth.middleare");
const router = (0, express_1.Router)();
/**
 * Study year payload
 * @typedef {object} StudyYearRequest
 * @property {string} name.required - Label, e.g. "2024-2025"
 * @property {string} startDate.required - Start ISO date
 * @property {string} endDate.required - End ISO date
 */
/**
 * GET /api/years
 * @summary List study years with quarters
 * @tags Years
 * @return {array<object>} 200 - Study year list
 */
router.get("/", year_controller_1.getYears);
/**
 * POST /api/years
 * @summary Create a study year
 * @tags Years
 * @param {string} Authorization.header.required - Bearer access token
 * @param {StudyYearRequest} request.body.required - Study year data
 * @return {object} 201 - Created study year
 * @return {object} 400 - Invalid name or dates
 */
router.post("/", auth_middleare_1.verifyAdmin, year_controller_1.createYear);
/**
 * PUT /api/years/{id}
 * @summary Update a study year
 * @tags Years
 * @param {string} Authorization.header.required - Bearer access token
 * @param {number} id.path.required - Study year ID
 * @param {object} request.body.required - Fields to update
 * @return {object} 200 - Updated study year
 */
router.put("/:id", auth_middleare_1.verifyAdmin, year_controller_1.updateYear);
/**
 * DELETE /api/years/{id}
 * @summary Delete a study year
 * @tags Years
 * @param {string} Authorization.header.required - Bearer access token
 * @param {number} id.path.required - Study year ID
 * @return {object} 200 - Delete confirmation
 */
router.delete("/:id", auth_middleare_1.verifyAdmin, year_controller_1.deleteYear);
/**
 * Study year rollover payload
 * @typedef {object} StudyYearRolloverRequest
 * @property {string} name.required - New study year label
 * @property {string} startDate.required - Start ISO date
 * @property {string} endDate.required - End ISO date
 * @property {boolean} moveStudents - Move current students to the new year (default true)
 * @property {boolean} incrementGrades - Increment grades while moving students (default true)
 * @property {boolean} copyQuarters - Copy quarter names into the new year (default true)
 * @property {number} graduateAt - Students with grade number >= this are treated as graduates and are not moved (default 11)
 */
/**
 * POST /api/years/{id}/rollover
 * @summary Create a new study year and optionally move/promote students
 * @tags Years
 * @param {string} Authorization.header.required - Bearer access token
 * @param {number} id.path.required - Source study year ID
 * @param {StudyYearRolloverRequest} request.body.required - Rollover options
 * @return {object} 201 - Rollover summary
 * @return {object} 400 - Validation error
 * @return {object} 404 - Study year not found
 */
router.post("/:id/rollover", auth_middleare_1.verifyAdmin, year_controller_1.rolloverYear);
exports.default = router;
