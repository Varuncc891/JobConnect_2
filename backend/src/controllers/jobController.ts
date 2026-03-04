import { Request, Response, NextFunction } from 'express';
import { catchAsyncErrors } from "../middlewares/catchAsyncError";
import { Job } from "../models/job.model";
import ErrorHandler from "../middlewares/error";
import { clearJobListingsCache, clearSingleJobCache } from '../middlewares/cache.middleware';

export const getAllJobs = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const category = req.query.category as string | undefined;
    const city = req.query.city as string | undefined;
    const country = req.query.country as string | undefined;
    const minSalary = req.query.minSalary ? Number(req.query.minSalary) : undefined;
    const maxSalary = req.query.maxSalary ? Number(req.query.maxSalary) : undefined;
    const sortBy = (req.query.sortBy as string) || 'newest';

    const skip = (page - 1) * limit;

    const filter: any = { expired: false };

    if (category) filter.category = { $regex: category, $options: 'i' };
    if (city) filter.city = { $regex: city, $options: 'i' };
    if (country) filter.country = { $regex: country, $options: 'i' };

    if (minSalary || maxSalary) {
      const salaryConditions: any[] = [];

      if (minSalary) {
        salaryConditions.push({ fixedSalary: { $gte: minSalary } });
        salaryConditions.push({ salaryFrom: { $gte: minSalary } });
        salaryConditions.push({ salaryTo: { $gte: minSalary } });
      }
      if (maxSalary) {
        salaryConditions.push({ fixedSalary: { $lte: maxSalary } });
        salaryConditions.push({ salaryFrom: { $lte: maxSalary } });
        salaryConditions.push({ salaryTo: { $lte: maxSalary } });
      }

      if (salaryConditions.length > 0) {
        filter.$or = salaryConditions;
      }
    }

    let sortOption: any = {};
    switch (sortBy) {
      case 'oldest': sortOption = { jobPostedOn: 1 }; break;
      case 'salary-high': sortOption = { fixedSalary: -1, salaryTo: -1 }; break;
      case 'salary-low': sortOption = { fixedSalary: 1, salaryFrom: 1 }; break;
      default: sortOption = { jobPostedOn: -1 };
    }

    const totalJobs = await Job.countDocuments(filter);
    const jobs = await Job.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .populate('postedBy', 'name email');

    const totalPages = Math.ceil(totalJobs / limit);

    res.status(200).json({
      success: true,
      jobs,
      pagination: {
        currentPage: page,
        totalPages,
        totalJobs,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
      },
      filters: {
        applied: {
          category: category || null,
          city: city || null,
          country: country || null,
          minSalary: minSalary || null,
          maxSalary: maxSalary || null,
        },
        sortBy,
      },
    });
  }
);

export const postJob = catchAsyncErrors(
  async (req: any, res: Response, next: NextFunction) => {
    const { role } = req.user;

    if (role === "Job Seeker") {
      return next(new ErrorHandler("Job Seeker not allowed to access this resource.", 400));
    }

    const { title, description, category, country, city, location, fixedSalary, salaryFrom, salaryTo } = req.body;

    if (!title || !description || !category || !country || !city || !location) {
      return next(new ErrorHandler("Please provide full job details.", 400));
    }

    if ((!salaryFrom || !salaryTo) && !fixedSalary) {
      return next(new ErrorHandler("Please either provide fixed salary or ranged salary.", 400));
    }

    if (salaryFrom && salaryTo && fixedSalary) {
      return next(new ErrorHandler("Cannot Enter Fixed and Ranged Salary together.", 400));
    }

    const job = await Job.create({
      title,
      description,
      category,
      country,
      city,
      location,
      fixedSalary,
      salaryFrom,
      salaryTo,
      postedBy: req.user._id,
    });

    await clearJobListingsCache();

    res.status(200).json({
      success: true,
      message: "Job Posted Successfully!",
      job,
    });
  }
);

export const getMyJobs = catchAsyncErrors(
  async (req: any, res: Response, next: NextFunction) => {
    const { role } = req.user;

    if (role === "Job Seeker") {
      return next(new ErrorHandler("Job Seeker not allowed to access this resource.", 400));
    }

    const myJobs = await Job.find({ postedBy: req.user._id });

    res.status(200).json({
      success: true,
      myJobs,
    });
  }
);

export const updateJob = catchAsyncErrors(
  async (req: any, res: Response, next: NextFunction) => {
    const { role } = req.user;

    if (role === "Job Seeker") {
      return next(new ErrorHandler("Job Seeker not allowed to access this resource.", 400));
    }

    const { id } = req.params;
    let job = await Job.findById(id);

    if (!job) {
      return next(new ErrorHandler("OOPS! Job not found.", 404));
    }

    job = await Job.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    });

    await Promise.all([clearJobListingsCache(), clearSingleJobCache(id)]);

    res.status(200).json({
      success: true,
      message: "Job Updated!",
    });
  }
);

export const deleteJob = catchAsyncErrors(
  async (req: any, res: Response, next: NextFunction) => {
    const { role } = req.user;

    if (role === "Job Seeker") {
      return next(new ErrorHandler("Job Seeker not allowed to access this resource.", 400));
    }

    const { id } = req.params;
    const job = await Job.findById(id);

    if (!job) {
      return next(new ErrorHandler("OOPS! Job not found.", 404));
    }

    await job.deleteOne();
    await Promise.all([clearJobListingsCache(), clearSingleJobCache(id)]);

    res.status(200).json({
      success: true,
      message: "Job Deleted!",
    });
  }
);

export const getSingleJob = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
      const job = await Job.findById(id);

      if (!job) {
        return next(new ErrorHandler("Job not found.", 404));
      }

      res.status(200).json({
        success: true,
        job,
      });
    } catch (error) {
      return next(new ErrorHandler("Invalid ID / CastError", 404));
    }
  }
);