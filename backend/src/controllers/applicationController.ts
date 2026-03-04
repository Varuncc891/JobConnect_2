import { Request, Response, NextFunction } from 'express';
import { catchAsyncErrors } from "../middlewares/catchAsyncError";
import ErrorHandler from "../middlewares/error";
import { Application } from "../models/application.model";
import { Job } from "../models/job.model";
import { User } from "../models/user.model";
import { v2 as cloudinary } from 'cloudinary';
import { notifyEmployer } from './sseController';
import { sendJobStatusEmail } from '../services/email.service';

export const postApplication = catchAsyncErrors(
  async (req: any, res: Response, next: NextFunction) => {
    const { role } = req.user;

    if (role === "Employer") {
      return next(new ErrorHandler("Employer not allowed to access this resource.", 400));
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      return next(new ErrorHandler("Resume File Required!", 400));
    }

    const { resume } = req.files;
    const allowedFormats = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

    if (!allowedFormats.includes(resume.mimetype)) {
      return next(new ErrorHandler("Invalid file type. Please upload a PNG, JPEG, or WEBP file.", 400));
    }

    try {
      const cloudinaryResponse = await cloudinary.uploader.upload(resume.tempFilePath, {
        resource_type: "auto",
        access_mode: "public",
        folder: "resumes",
        format: "pdf",
        flags: "attachment:false",
      });

      if (!cloudinaryResponse || cloudinaryResponse.error) {
        return next(new ErrorHandler("Failed to upload Resume to Cloudinary", 500));
      }

      const { name, email, coverLetter, phone, address, jobId } = req.body;

      const applicantID = {
        user: req.user._id,
        role: "Job Seeker",
      };

      if (!jobId) {
        return next(new ErrorHandler("Job not found!", 404));
      }

      const jobDetails = await Job.findById(jobId);

      if (!jobDetails) {
        return next(new ErrorHandler("Job not found!", 404));
      }

      const employerID = {
        user: jobDetails.postedBy,
        role: "Employer",
      };

      if (!name || !email || !coverLetter || !phone || !address || !applicantID || !employerID || !resume) {
        return next(new ErrorHandler("Please fill all fields.", 400));
      }

      const application = await Application.create({
        name,
        email,
        coverLetter,
        phone,
        address,
        jobId: jobDetails._id,
        applicantID,
        employerID,
        resume: {
          public_id: cloudinaryResponse.public_id,
          url: cloudinaryResponse.secure_url,
        },
        status: 'Pending',
      });

      const employerId = jobDetails.postedBy.toString();
      notifyEmployer(employerId, {
        type: 'NEW_APPLICATION',
        message: `New application received for ${jobDetails.title}`,
        application: {
          id: application._id,
          applicantName: name,
          applicantEmail: email,
          jobTitle: jobDetails.title,
          jobId: jobDetails._id,
          appliedAt: (application as any).createdAt || new Date().toISOString(),
          coverLetter: coverLetter.substring(0, 150) + (coverLetter.length > 150 ? '...' : ''),
          status: 'Pending',
          resume: application.resume.url,
        },
        timestamp: new Date().toISOString(),
      });

      res.status(200).json({
        success: true,
        message: "Application Submitted!",
        application,
      });
    } catch (error: any) {
      if (error.message && error.message.includes("api_key")) {
        return next(new ErrorHandler("File upload service configuration error", 500));
      }
      return next(error);
    }
  }
);

export const updateApplicationStatus = catchAsyncErrors(
  async (req: any, res: Response, next: NextFunction) => {
    const { role } = req.user;

    if (role !== "Employer") {
      return next(new ErrorHandler("Only employers can update application status.", 403));
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!['Accepted', 'Rejected'].includes(status)) {
      return next(new ErrorHandler("Status must be either 'Accepted' or 'Rejected'", 400));
    }

    const application = await Application.findById(id);

    if (!application) {
      return next(new ErrorHandler("Application not found!", 404));
    }

    if (application.employerID.user.toString() !== req.user._id.toString()) {
      return next(new ErrorHandler("You are not authorized to update this application", 403));
    }

    application.status = status;

    const job = await Job.findById((application as any).jobId).populate('postedBy');

    if (!job) {
      return next(new ErrorHandler("Associated job not found", 404));
    }

    const employer = job.postedBy as any;
    const seeker = await User.findById(application.applicantID.user);

    try {
      if (seeker?.email && seeker?.name && job?.title) {
        await sendJobStatusEmail(
          seeker.email,
          seeker.name,
          job.title,
          employer?.name || 'Company',
          status.toLowerCase()
        );
      }
    } catch (error) {
      console.error('Email notification failed:', error);
    }

    await application.save();

    res.status(200).json({
      success: true,
      message: `Application ${status.toLowerCase()} successfully`,
      application,
    });
  }
);

export const employerGetAllApplications = catchAsyncErrors(
  async (req: any, res: Response, next: NextFunction) => {
    const { role } = req.user;

    if (role === "Job Seeker") {
      return next(new ErrorHandler("Job Seeker not allowed to access this resource.", 400));
    }

    const { _id } = req.user;
    const applications = await Application.find({ "employerID.user": _id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      applications,
    });
  }
);

export const jobseekerGetAllApplications = catchAsyncErrors(
  async (req: any, res: Response, next: NextFunction) => {
    const { role } = req.user;

    if (role === "Employer") {
      return next(new ErrorHandler("Employer not allowed to access this resource.", 400));
    }

    const { _id } = req.user;
    const applications = await Application.find({ "applicantID.user": _id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      applications,
    });
  }
);

export const jobseekerDeleteApplication = catchAsyncErrors(
  async (req: any, res: Response, next: NextFunction) => {
    const { role } = req.user;

    if (role === "Employer") {
      return next(new ErrorHandler("Employer not allowed to access this resource.", 400));
    }

    const { id } = req.params;
    const application = await Application.findById(id);

    if (!application) {
      return next(new ErrorHandler("Application not found!", 404));
    }

    await application.deleteOne();

    res.status(200).json({
      success: true,
      message: "Application Deleted!",
    });
  }
);