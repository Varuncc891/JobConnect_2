import { Request, Response, NextFunction } from 'express';
import { catchAsyncErrors } from '../middlewares/catchAsyncError';
import ErrorHandler from '../middlewares/error';
import { ResumeParserService } from '../services/resumeParser.service';
import { v2 as cloudinary } from 'cloudinary';
import { UploadedFile } from 'express-fileupload';
import fs from 'fs';
import util from 'util';

const readFile = util.promisify(fs.readFile);

export const parseResume = catchAsyncErrors(
  async (req: any, res: Response, next: NextFunction) => {
    if (!req.files || Object.keys(req.files).length === 0) {
      return next(new ErrorHandler("Please upload a resume file", 400));
    }

    const resumeFile = req.files.resume as UploadedFile;

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

    if (!allowedTypes.includes(resumeFile.mimetype)) {
      return next(new ErrorHandler("Invalid file type. Please upload PDF, PNG, JPEG, or WEBP", 400));
    }

    if (resumeFile.size > 5 * 1024 * 1024) {
      return next(new ErrorHandler("File size too large. Maximum 5MB allowed", 400));
    }

    try {
      const fileBuffer = await readFile(resumeFile.tempFilePath);

      const parserService = new ResumeParserService();
      const parsedData = await parserService.parseResume(
        Buffer.from(fileBuffer),
        Buffer.from(fileBuffer),
        resumeFile.name
      );

      let cloudinaryResponse = null;
      try {
        cloudinaryResponse = await cloudinary.uploader.upload(resumeFile.tempFilePath, {
          folder: "resumes",
          resource_type: "auto",
        });
      } catch (cloudinaryError) {
        console.error("Cloudinary upload failed:", cloudinaryError);
      }

      res.status(200).json({
        success: true,
        message: "Resume parsed successfully",
        parsed: parsedData,
        cloudinary: cloudinaryResponse
          ? { url: cloudinaryResponse.secure_url, public_id: cloudinaryResponse.public_id }
          : null,
      });
    } catch (error: any) {
      return next(new ErrorHandler("Failed to parse resume", 500));
    }
  }
);