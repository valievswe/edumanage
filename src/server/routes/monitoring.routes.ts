import { Router } from "express";
import {
  getMonitorings,
  getMonitoringById,
  createMonitoring,
  updateMonitoring,
  deleteMonitoring,
} from "../controllers/monitoring.controller";
import { verifyAdmin } from "../middleware/auth.middleare";

const router = Router();

/**
 * Monitoring payload
 * @typedef {object} MonitoringRequest
 * @property {string} month.required - Month label, e.g. "January"
 * @property {number} score.required - Monitoring score
 * @property {string} studentId.required - Student identifier
 * @property {number} subjectId.required - Subject ID
 * @property {number} studyYearId.required - Study year ID
 */

/**
 * GET /api/monitoring
 * @summary List monitoring entries
 * @tags Monitoring
 * @param {string} Authorization.header.required - Bearer access token
 * @param {number} studyYearId.query - Study year filter
 * @param {number} gradeId.query - Grade filter
 * @param {string} search.query - Student name or ID
 * @return {array<object>} 200 - Monitoring list
 */
router.get("/", verifyAdmin, getMonitorings);

/**
 * GET /api/monitoring/{id}
 * @summary Get monitoring by ID
 * @tags Monitoring
 * @param {string} Authorization.header.required - Bearer access token
 * @param {number} id.path.required - Monitoring ID
 * @return {object} 200 - Monitoring entry
 * @return {object} 404 - Monitoring not found
 */
router.get("/:id", verifyAdmin, getMonitoringById);

/**
 * POST /api/monitoring
 * @summary Create a monitoring record
 * @tags Monitoring
 * @param {string} Authorization.header.required - Bearer access token
 * @param {MonitoringRequest} request.body.required - Monitoring data
 * @return {object} 201 - Created monitoring entry
 */
router.post("/", verifyAdmin, createMonitoring);

/**
 * PUT /api/monitoring/{id}
 * @summary Update monitoring details
 * @tags Monitoring
 * @param {string} Authorization.header.required - Bearer access token
 * @param {number} id.path.required - Monitoring ID
 * @param {object} request.body.required - Fields to update (score, month, subjectId, studyYearId)
 * @return {object} 200 - Updated monitoring entry
 */
router.put("/:id", verifyAdmin, updateMonitoring);

/**
 * DELETE /api/monitoring/{id}
 * @summary Delete monitoring entry
 * @tags Monitoring
 * @param {string} Authorization.header.required - Bearer access token
 * @param {number} id.path.required - Monitoring ID
 * @return {object} 200 - Delete confirmation
 */
router.delete("/:id", verifyAdmin, deleteMonitoring);

export default router;
