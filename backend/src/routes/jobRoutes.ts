import express from 'express';
import { deleteJob, getAllJobs, getMyJobs, getSingleJob, postJob, updateJob } from '../controllers/jobController';
import { isAuthenticated } from '../middlewares/auth';
import { validate } from '../middlewares/validate.middleware';
import { postJobSchema, updateJobSchema } from '../validators/job.validator';
import { cache } from '../middlewares/cache.middleware';

const router = express.Router();

router.get("/getall", cache(300), getAllJobs);
router.get("/getmyjobs", isAuthenticated, getMyJobs);
router.get("/:id", cache(300), getSingleJob);
router.post("/post", isAuthenticated, validate(postJobSchema), postJob);
router.put("/update/:id", isAuthenticated, validate(updateJobSchema), updateJob);
router.delete("/delete/:id", isAuthenticated, deleteJob);

export default router;