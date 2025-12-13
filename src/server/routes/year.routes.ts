import { Router } from "express";
import { getYears, createYear, deleteYear, updateYear, rolloverYear } from "../controllers/year.controller";
import { verifyAdmin } from "../middleware/auth.middleare";

const router = Router();

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
router.get("/", getYears);

/**
 * POST /api/years
 * @summary Create a study year
 * @tags Years
 * @param {string} Authorization.header.required - Bearer access token
 * @param {StudyYearRequest} request.body.required - Study year data
 * @return {object} 201 - Created study year
 * @return {object} 400 - Invalid name or dates
 */
router.post("/", verifyAdmin, createYear);

/**
 * PUT /api/years/{id}
 * @summary Update a study year
 * @tags Years
 * @param {string} Authorization.header.required - Bearer access token
 * @param {number} id.path.required - Study year ID
 * @param {object} request.body.required - Fields to update
 * @return {object} 200 - Updated study year
 */
router.put("/:id", verifyAdmin, updateYear);

/**
 * DELETE /api/years/{id}
 * @summary Delete a study year
 * @tags Years
 * @param {string} Authorization.header.required - Bearer access token
 * @param {number} id.path.required - Study year ID
 * @return {object} 200 - Delete confirmation
 */
router.delete("/:id", verifyAdmin, deleteYear);

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
router.post("/:id/rollover", verifyAdmin, rolloverYear);

export default router;
