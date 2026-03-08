import express from 'express';
import { login, register, logout, getUser } from '../controllers/userController';
import { isAuthenticated } from '../middlewares/auth';
import { validate } from '../middlewares/validate.middleware';
import { registerSchema, loginSchema } from '../validators/user.validator';

const router = express.Router();
/**
 * @swagger
 * /user/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, role, phone]
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: Password123
 *               role:
 *                 type: string
 *                 enum: [Job Seeker, Employer]
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 */
router.post("/register", validate(registerSchema), register);
/**
 * @swagger
 * /user/login:
 *   post:
 *     summary: Login and receive auth cookie
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, role]
 *             properties:
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: Password123
 *               role:
 *                 type: string
 *                 enum: [Job Seeker, Employer]
 *     responses:
 *       200:
 *         description: Login successful, cookie set
 *       400:
 *         description: Invalid credentials
 */
router.post("/login", validate(loginSchema), login);
/**
 * @swagger
 * /user/logout:
 *   get:
 *     summary: Logout and clear auth cookie
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.get("/logout", isAuthenticated, logout);
router.get("/getuser", isAuthenticated, getUser);

export default router;