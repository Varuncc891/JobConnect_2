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

router.post("/post", isAuthenticated, validate(postApplicationSchema), postApplication);
router.get("/employer/getall", isAuthenticated, employerGetAllApplications);
router.get("/jobseeker/getall", isAuthenticated, jobseekerGetAllApplications);
router.delete("/delete/:id", isAuthenticated, jobseekerDeleteApplication);
router.put("/status/:id", isAuthenticated, updateApplicationStatus);

export default router;