import express from 'express';
import { parseResume } from '../controllers/resumeController';
import { isAuthenticated } from '../middlewares/auth';

const router = express.Router();

router.post("/parse", isAuthenticated, parseResume);

export default router;