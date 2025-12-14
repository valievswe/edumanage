"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const subject_controller_1 = require("../controllers/subject.controller");
const auth_middleare_1 = require("../middleware/auth.middleare");
const router = (0, express_1.Router)();
/**
 * Subject payload
 * @typedef {object} SubjectRequest
 * @property {string} name.required - Subject name
 */
/**
 * GET /api/subjects
 * @summary List subjects
 * @tags Subjects
 * @param {string} Authorization.header.required - Bearer access token
 * @return {array<object>} 200 - Subject list
 */
router.get("/", auth_middleare_1.verifyAdmin, subject_controller_1.getSubjects);
/**
 * POST /api/subjects
 * @summary Create a subject
 * @tags Subjects
 * @param {string} Authorization.header.required - Bearer access token
 * @param {SubjectRequest} request.body.required - Subject data
 * @return {object} 201 - Created subject
 */
router.post("/", auth_middleare_1.verifyAdmin, subject_controller_1.createSubject);
/**
 * PUT /api/subjects/{id}
 * @summary Update subject name
 * @tags Subjects
 * @param {string} Authorization.header.required - Bearer access token
 * @param {number} id.path.required - Subject ID
 * @param {SubjectRequest} request.body.required - New values
 * @return {object} 200 - Updated subject
 */
router.put("/:id", auth_middleare_1.verifyAdmin, subject_controller_1.updateSubject);
/**
 * DELETE /api/subjects/{id}
 * @summary Delete a subject
 * @tags Subjects
 * @param {string} Authorization.header.required - Bearer access token
 * @param {number} id.path.required - Subject ID
 * @return {object} 200 - Delete confirmation
 */
router.delete("/:id", auth_middleare_1.verifyAdmin, subject_controller_1.deleteSubject);
exports.default = router;
