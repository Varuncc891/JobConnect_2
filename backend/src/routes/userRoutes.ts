import express from 'express';
import { login, register, logout, getUser } from '../controllers/userController';
import { isAuthenticated } from '../middlewares/auth';
import { validate } from '../middlewares/validate.middleware';
import { registerSchema, loginSchema } from '../validators/user.validator';

const router = express.Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.get("/logout", isAuthenticated, logout);
router.get("/getuser", isAuthenticated, getUser);

export default router;