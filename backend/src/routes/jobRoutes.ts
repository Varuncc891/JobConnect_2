import express from 'express';
import { deleteJob, getAllJobs, getMyJobs, getSingleJob, postJob, updateJob } from '../controllers/jobController';
import { isAuthenticated } from '../middlewares/auth';
import { validate } from '../middlewares/validate.middleware';
import { postJobSchema, updateJobSchema } from '../validators/job.validator';
import { cache } from '../middlewares/cache.middleware';

const router = express.Router();

/**
 * @swagger
 * /job/getall:
 *   get:
 *     summary: Get all jobs with pagination and filtering
 *     tags: [Jobs]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: minSalary
 *         schema:
 *           type: number
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest, salary-high, salary-low]
 *           default: newest
 *     responses:
 *       200:
 *         description: Paginated job listings
 */
router.get("/getall", cache(300), getAllJobs);

/**
 * @swagger
 * /job/getmyjobs:
 *   get:
 *     summary: Get all jobs posted by logged in employer
 *     tags: [Jobs]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of employer's jobs
 *       401:
 *         description: Unauthorized
 */
router.get("/getmyjobs", isAuthenticated, getMyJobs);

/**
 * @swagger
 * /job/{id}:
 *   get:
 *     summary: Get a single job by ID
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 64f1a2b3c4d5e6f7a8b9c0d1
 *     responses:
 *       200:
 *         description: Job details
 *       404:
 *         description: Job not found
 */
router.get("/:id", cache(300), getSingleJob);

/**
 * @swagger
 * /job/post:
 *   post:
 *     summary: Post a new job (Employer only)
 *     tags: [Jobs]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, category, country, city]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Frontend Developer
 *               description:
 *                 type: string
 *                 example: We are looking for a React developer...
 *               category:
 *                 type: string
 *                 example: Engineering
 *               country:
 *                 type: string
 *                 example: India
 *               city:
 *                 type: string
 *                 example: Bangalore
 *               fixedSalary:
 *                 type: number
 *                 example: 800000
 *     responses:
 *       201:
 *         description: Job posted successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/post", isAuthenticated, validate(postJobSchema), postJob);

/**
 * @swagger
 * /job/update/{id}:
 *   put:
 *     summary: Update a job (Employer only)
 *     tags: [Jobs]
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               expired:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Job updated successfully
 *       401:
 *         description: Unauthorized
 */
router.put("/update/:id", isAuthenticated, validate(updateJobSchema), updateJob);

/**
 * @swagger
 * /job/delete/{id}:
 *   delete:
 *     summary: Delete a job (Employer only)
 *     tags: [Jobs]
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
 *         description: Job deleted successfully
 *       401:
 *         description: Unauthorized
 */
router.delete("/delete/:id", isAuthenticated, deleteJob);

export default router;