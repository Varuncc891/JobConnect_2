import express from 'express';
import { parseResume } from '../controllers/resumeController';
import { isAuthenticated } from '../middlewares/auth';

const router = express.Router();

/**
 * @swagger
 * /resume/parse:
 *   post:
 *     summary: Parse a resume PDF and return structured data
 *     tags: [Resume]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               resume:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Parsed resume data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 phone:
 *                   type: string
 *                 skills:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: Unauthorized
 */
router.post("/parse", isAuthenticated, parseResume);

export default router;