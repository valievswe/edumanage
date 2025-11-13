import { Router } from "express";
import {
  getGrades,
  createGrade,
  updateGrade,
  deleteGrade,
} from "../controllers/grade.controller";
import { verifyAdmin } from "../middleware/auth.middleare";

const router = Router();

/**
 * Grade payload
 * @typedef {object} GradeRequest
 * @property {string} name.required - Display name, e.g. "Grade 5"
 */

/**
 * GET /api/grades
 * @summary List grades with student counts
 * @tags Grades
 * @param {string} Authorization.header.required - Bearer access token
 * @return {array<object>} 200 - Ordered grade list
 */
router.get("/", verifyAdmin, getGrades);

/**
 * POST /api/grades
 * @summary Create a grade
 * @tags Grades
 * @param {string} Authorization.header.required - Bearer access token
 * @param {GradeRequest} request.body.required - Grade data
 * @return {object} 201 - Created grade
 * @return {object} 400 - Validation error
 */
router.post("/", verifyAdmin, createGrade);

/**
 * PUT /api/grades/{id}
 * @summary Update a grade name
 * @tags Grades
 * @param {string} Authorization.header.required - Bearer access token
 * @param {number} id.path.required - Grade ID
 * @param {GradeRequest} request.body.required - New values
 * @return {object} 200 - Updated grade
 */
router.put("/:id", verifyAdmin, updateGrade);

/**
 * DELETE /api/grades/{id}
 * @summary Remove a grade
 * @tags Grades
 * @param {string} Authorization.header.required - Bearer access token
 * @param {number} id.path.required - Grade ID
 * @return {object} 200 - Delete confirmation
 */
router.delete("/:id", verifyAdmin, deleteGrade);

export default router;
