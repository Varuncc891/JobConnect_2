import express from 'express';
import {
  employerGetAllApplications,
  jobseekerDeleteApplication,
  jobseekerGetAllApplications,
  postApplication,
  updateApplicationStatus,
} from '../controllers/applicationController';
import { isAuthenticated } from '../middlewares/auth';
import { validate } from '../middlewares/validate.middleware';
import { postApplicationSchema } from '../validators/application.validator';

const router = express.Router();

/**
 * @swagger
 * /application/post:
 *   post:
 *     summary: Apply for a job (Job Seeker only)
 *     tags: [Applications]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, email, phone, address, coverLetter, jobId]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               coverLetter:
 *                 type: string
 *               jobId:
 *                 type: string
 *               resume:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Application submitted successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post("/post", isAuthenticated, validate(postApplicationSchema), postApplication);

/**
 * @swagger
 * /application/employer/getall:
 *   get:
 *     summary: Get all applications received (Employer only)
 *     tags: [Applications]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of received applications
 *       401:
 *         description: Unauthorized
 */
router.get("/employer/getall", isAuthenticated, employerGetAllApplications);

/**
 * @swagger
 * /application/jobseeker/getall:
 *   get:
 *     summary: Get all applications submitted (Job Seeker only)
 *     tags: [Applications]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of submitted applications
 *       401:
 *         description: Unauthorized
 */
router.get("/jobseeker/getall", isAuthenticated, jobseekerGetAllApplications);

/**
 * @swagger
 * /application/delete/{id}:
 *   delete:
 *     summary: Delete an application (Job Seeker only)
 *     tags: [Applications]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Application deleted
 *       401:
 *         description: Unauthorized
 */
router.delete("/delete/:id", isAuthenticated, jobseekerDeleteApplication);

/**
 * @swagger
 * /application/status/{id}:
 *   put:
 *     summary: Accept or reject an application (Employer only)
 *     tags: [Applications]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Accepted, Rejected]
 *     responses:
 *       200:
 *         description: Status updated, email sent to applicant
 *       401:
 *         description: Unauthorized
 */
router.put("/status/:id", isAuthenticated, updateApplicationStatus);

export default router;