import express from 'express';
import { isAuthenticated } from '../middlewares/auth';
import { handleSSEConnection } from '../controllers/sseController';

const router = express.Router();

router.get('/events', isAuthenticated, handleSSEConnection);

export default router;