import { Router } from "express";
import {
  getMarks,
  getMarkById,
  createMark,
  updateMark,
  deleteMark,
  upsertBulkMarks,
} from "../controllers/mark.controller";
import { verifyAdmin } from "../middleware/auth.middleare";

const router = Router();

/**
 * Mark payload
 * @typedef {object} MarkRequest
 * @property {number} score.required - Numeric mark
 * @property {string} studentId.required - Student identifier
 * @property {number} subjectId.required - Subject ID
 * @property {number} quarterId.required - Quarter ID
 */

/**
 * Bulk mark payload
 * @typedef {object} MarkBulkEntry
 * @property {string} studentId.required - Student identifier
 * @property {number} subjectId.required - Subject ID
 * @property {number} quarterId.required - Quarter ID
 * @property {number} score.required - Numeric mark
 */

/**
 * @typedef {object} MarkBulkRequest
 * @property {Array<MarkBulkEntry>} entries.required - Marks to upsert
 */

/**
 * GET /api/marks
 * @summary Search marks with optional filters
 * @tags Marks
 * @param {string} Authorization.header.required - Bearer access token
 * @param {string} studentId.query - Student ID
 * @param {number} subjectId.query - Subject ID
 * @param {number} quarterId.query - Quarter ID
 * @param {number} gradeId.query - Grade ID
 * @param {number} studyYearId.query - Study year ID
 * @param {string} search.query - Student name or ID
 * @return {array<object>} 200 - Matching marks
 */
router.get("/", verifyAdmin, getMarks);

/**
 * GET /api/marks/{id}
 * @summary Get a single mark
 * @tags Marks
 * @param {string} Authorization.header.required - Bearer access token
 * @param {number} id.path.required - Mark ID
 * @return {object} 200 - Mark with relations
 * @return {object} 404 - Mark not found
 */
router.get("/:id", verifyAdmin, getMarkById);

/**
 * POST /api/marks
 * @summary Create a mark
 * @tags Marks
 * @param {string} Authorization.header.required - Bearer access token
 * @param {MarkRequest} request.body.required - Mark data
 * @return {object} 201 - Created mark
 */
router.post("/", verifyAdmin, createMark);

/**
 * POST /api/marks/bulk
 * @summary Upsert many marks at once
 * @tags Marks
 * @param {string} Authorization.header.required - Bearer access token
 * @param {MarkBulkRequest} request.body.required - Entries to upsert
 * @return {object} 200 - Summary of upserts
 * @return {object} 400 - Invalid payload
 */
router.post("/bulk", verifyAdmin, upsertBulkMarks);

/**
 * PUT /api/marks/{id}
 * @summary Update a mark score
 * @tags Marks
 * @param {string} Authorization.header.required - Bearer access token
 * @param {number} id.path.required - Mark ID
 * @param {object} request.body.required - Fields to update
 * @param {number} request.body.score - New score
 * @return {object} 200 - Updated mark
 */
router.put("/:id", verifyAdmin, updateMark);

/**
 * DELETE /api/marks/{id}
 * @summary Delete a mark
 * @tags Marks
 * @param {string} Authorization.header.required - Bearer access token
 * @param {number} id.path.required - Mark ID
 * @return {object} 200 - Delete confirmation
 */
router.delete("/:id", verifyAdmin, deleteMark);

export default router;
