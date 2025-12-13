import { Router } from "express";
import { verifyAdmin } from "../middleware/auth.middleare";
import {
  getStudents,
  getStudentOptions,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentMarks,
} from "../controllers/student.controller";

const router = Router();

// ---- ADMIN (LIGHTWEIGHT OPTIONS) ----
/**
 * GET /api/students/options
 * @summary Lightweight student list for dropdowns (admin)
 * @tags Students
 * @param {string} Authorization.header.required - Bearer access token
 * @param {string} search.query - Partial name or ID
 * @param {number} studyYearId.query - Study year filter
 * @param {number} gradeId.query - Grade filter
 * @param {number} limit.query - Max results (default 2000)
 * @return {array<object>} 200 - Student options
 */
router.get("/options", verifyAdmin, getStudentOptions);

/**
 * Student payload
 * @typedef {object} StudentRequest
 * @property {string} id.required - School-issued student ID
 * @property {string} fullName.required - Full name
 * @property {number} gradeId.required - Grade ID
 * @property {number} studyYearId.required - Study year ID
 */

// ---- PUBLIC ROUTES (for parents / bot) ----
/**
 * GET /api/students/{id}/marks
 * @summary Public student marks snapshot
 * @tags Students
 * @param {string} id.path.required - Student ID
 * @return {object} 200 - Student marks and monitoring summary
 * @return {object} 404 - Student not found
 */
router.get("/:id/marks", getStudentMarks); // no verifyAdmin

/**
 * GET /api/students/{id}
 * @summary Public student profile
 * @tags Students
 * @param {string} id.path.required - Student ID
 * @return {object} 200 - Student with marks & monitoring
 * @return {object} 404 - Student not found
 */
router.get("/:id", getStudentById);        // no verifyAdmin

// ---- ADMIN ROUTES ----
/**
 * GET /api/students
 * @summary List students with filters
 * @tags Students
 * @param {string} Authorization.header.required - Bearer access token
 * @param {string} search.query - Partial name or ID
 * @param {number} studyYearId.query - Study year filter
 * @param {number} gradeId.query - Grade filter
 * @return {array<object>} 200 - Student list
 */
router.get("/", verifyAdmin, getStudents);

/**
 * POST /api/students
 * @summary Create a student
 * @tags Students
 * @param {string} Authorization.header.required - Bearer access token
 * @param {StudentRequest} request.body.required - Student data
 * @return {object} 201 - Created student
 * @return {object} 400 - Duplicate ID
 */
router.post("/", verifyAdmin, createStudent);

/**
 * PUT /api/students/{id}
 * @summary Update student name or grade
 * @tags Students
 * @param {string} Authorization.header.required - Bearer access token
 * @param {string} id.path.required - Student ID
 * @param {object} request.body.required - Updatable fields
 * @param {string} request.body.fullName - New name
 * @param {number} request.body.gradeId - Grade ID
 * @return {object} 200 - Updated student
 */
router.put("/:id", verifyAdmin, updateStudent);

/**
 * DELETE /api/students/{id}
 * @summary Delete a student
 * @tags Students
 * @param {string} Authorization.header.required - Bearer access token
 * @param {string} id.path.required - Student ID
 * @return {object} 200 - Delete confirmation
 */
router.delete("/:id", verifyAdmin, deleteStudent);

export default router;
