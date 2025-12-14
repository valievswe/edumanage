"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleare_1 = require("../middleware/auth.middleare");
const student_controller_1 = require("../controllers/student.controller");
const router = (0, express_1.Router)();
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
router.get("/options", auth_middleare_1.verifyAdmin, student_controller_1.getStudentOptions);
/**
 * Student payload
 * @typedef {object} StudentRequest
 * @property {string} id.required - School-issued student ID
 * @property {string} fullName.required - Full name
 * @property {number} gradeId.required - Grade ID
 * @property {number} studyYearId.required - Study year ID
 */
/**
 * Student import entry
 * @typedef {object} StudentImportEntry
 * @property {string} id.required - Student ID
 * @property {string} fullName.required - Full name
 * @property {number} gradeId - Grade ID (overrides selected grade)
 */
/**
 * @typedef {object} StudentImportRequest
 * @property {number} studyYearId.required - Study year to assign
 * @property {number} gradeId - Default grade for all rows
 * @property {boolean} updateExisting - Update existing students instead of skipping them
 * @property {Array<StudentImportEntry>} entries.required - Parsed rows from XLSX
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
router.get("/:id/marks", student_controller_1.getStudentMarks); // no verifyAdmin
/**
 * GET /api/students/{id}
 * @summary Public student profile
 * @tags Students
 * @param {string} id.path.required - Student ID
 * @return {object} 200 - Student with marks & monitoring
 * @return {object} 404 - Student not found
 */
router.get("/:id", student_controller_1.getStudentById); // no verifyAdmin
// ---- ADMIN ROUTES ----
/**
 * POST /api/students/import
 * @summary Import students from XLSX (client-side parsed)
 * @tags Students
 * @param {string} Authorization.header.required - Bearer access token
 * @param {StudentImportRequest} request.body.required - Parsed rows and options
 * @return {object} 200 - Import summary
 */
router.post("/import", auth_middleare_1.verifyAdmin, student_controller_1.importStudents);
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
router.get("/", auth_middleare_1.verifyAdmin, student_controller_1.getStudents);
/**
 * POST /api/students
 * @summary Create a student
 * @tags Students
 * @param {string} Authorization.header.required - Bearer access token
 * @param {StudentRequest} request.body.required - Student data
 * @return {object} 201 - Created student
 * @return {object} 400 - Duplicate ID
 */
router.post("/", auth_middleare_1.verifyAdmin, student_controller_1.createStudent);
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
router.put("/:id", auth_middleare_1.verifyAdmin, student_controller_1.updateStudent);
/**
 * DELETE /api/students/{id}
 * @summary Delete a student
 * @tags Students
 * @param {string} Authorization.header.required - Bearer access token
 * @param {string} id.path.required - Student ID
 * @param {boolean} force.query - Set true to also delete related marks and monitoring
 * @return {object} 200 - Delete confirmation
 * @return {object} 409 - Student has related marks/monitoring
 */
router.delete("/:id", auth_middleare_1.verifyAdmin, student_controller_1.deleteStudent);
exports.default = router;
