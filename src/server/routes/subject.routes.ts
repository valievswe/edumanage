import { Router } from "express";
import {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} from "../controllers/subject.controller";
import { verifyAdmin } from "../middleware/auth.middleare";

const router = Router();

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
router.get("/", verifyAdmin, getSubjects);

/**
 * POST /api/subjects
 * @summary Create a subject
 * @tags Subjects
 * @param {string} Authorization.header.required - Bearer access token
 * @param {SubjectRequest} request.body.required - Subject data
 * @return {object} 201 - Created subject
 */
router.post("/", verifyAdmin, createSubject);

/**
 * PUT /api/subjects/{id}
 * @summary Update subject name
 * @tags Subjects
 * @param {string} Authorization.header.required - Bearer access token
 * @param {number} id.path.required - Subject ID
 * @param {SubjectRequest} request.body.required - New values
 * @return {object} 200 - Updated subject
 */
router.put("/:id", verifyAdmin, updateSubject);

/**
 * DELETE /api/subjects/{id}
 * @summary Delete a subject
 * @tags Subjects
 * @param {string} Authorization.header.required - Bearer access token
 * @param {number} id.path.required - Subject ID
 * @return {object} 200 - Delete confirmation
 */
router.delete("/:id", verifyAdmin, deleteSubject);

export default router;
