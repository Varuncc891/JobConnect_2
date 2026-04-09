import { Request, Response, NextFunction } from 'express';
import { postApplication, updateApplicationStatus, employerGetAllApplications, jobseekerGetAllApplications, jobseekerDeleteApplication } from '../applicationController';
import { Application } from '../../models/application.model';
import { Job } from '../../models/job.model';
import { User } from '../../models/user.model';
import ErrorHandler from '../../middlewares/error';
import { v2 as cloudinary } from 'cloudinary';
import { notifyEmployer } from '../sseController';
import { sendJobStatusEmail } from '../../services/email.service';

jest.mock('../../models/application.model');
jest.mock('../../models/job.model');
jest.mock('../../models/user.model');
jest.mock('cloudinary');
jest.mock('../sseController');
jest.mock('../../services/email.service');

(notifyEmployer as jest.Mock).mockImplementation(() => {});
(sendJobStatusEmail as jest.Mock).mockResolvedValue(undefined);

interface RequestWithUser extends Request {
  user?: any;
  files?: any;
}

describe('Application Controller', () => {
  let mockReq: Partial<RequestWithUser>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnThis();
    mockNext = jest.fn();

    mockReq = {
      body: {},
      params: {},
      user: null,
      files: null
    };

    mockRes = {
      json: mockJson,
      status: mockStatus
    };

    jest.clearAllMocks();
    (notifyEmployer as jest.Mock).mockReturnValue(undefined);
    (sendJobStatusEmail as jest.Mock).mockResolvedValue(undefined);
  });

  describe('postApplication', () => {
    const validApplicationData = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890',
      address: '123 Main St',
      coverLetter: 'I am interested in this position because...',
      jobId: 'job123'
    };

    const mockResume = {
      tempFilePath: '/tmp/resume.pdf',
      mimetype: 'application/pdf'
    };

    const mockCloudinaryResponse = {
      public_id: 'resume123',
      secure_url: 'https://cloudinary.com/resume.pdf'
    };

    test('should return 400 if user is employer', async () => {
      mockReq.user = { role: 'Employer' };

      await postApplication(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorHandler));
      const error = mockNext.mock.calls[0][0];
      expect(error.message).toBe('Employer not allowed to access this resource.');
    });

    test('should return 400 if no resume uploaded', async () => {
      mockReq.user = { role: 'Job Seeker' };
      mockReq.files = null;

      await postApplication(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorHandler));
    });

    test('should return 400 if invalid file type', async () => {
      mockReq.user = { role: 'Job Seeker' };
      mockReq.files = { resume: { mimetype: 'application/exe' } };

      await postApplication(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorHandler));
    });

    test('should return 404 if job not found', async () => {
      mockReq.user = { role: 'Job Seeker', _id: 'user123' };
      mockReq.files = { resume: mockResume };
      mockReq.body = validApplicationData;

      (Job.findById as jest.Mock).mockResolvedValue(null);

      await postApplication(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorHandler));
    });

    test('should create application successfully', async () => {
      mockReq.user = { role: 'Job Seeker', _id: 'user123' };
      mockReq.files = { resume: mockResume };
      mockReq.body = validApplicationData;

      const mockJob = {
        _id: 'job123',
        title: 'Software Engineer',
        postedBy: 'employer123',
      };

      const mockCreatedApplication = {
        _id: 'app123',
        ...validApplicationData,
        applicantID: { user: 'user123', role: 'Job Seeker' },
        employerID: { user: 'employer123', role: 'Employer' },
        resume: {
          public_id: mockCloudinaryResponse.public_id,
          url: mockCloudinaryResponse.secure_url,
        },
        status: 'Pending',
      };

      (Job.findById as jest.Mock).mockResolvedValue(mockJob);
      (cloudinary.uploader.upload as jest.Mock).mockResolvedValue(mockCloudinaryResponse);
      (Application.create as jest.Mock).mockResolvedValue(mockCreatedApplication);

      await postApplication(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
        mockResume.tempFilePath,
        expect.objectContaining({
          folder: 'resumes',
          resource_type: 'auto',
        })
      );
      expect(Application.create).toHaveBeenCalled();
      expect(notifyEmployer).toHaveBeenCalledWith('employer123', expect.any(Object));
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Application Submitted!',
        application: mockCreatedApplication,
      });
    });

    test('should handle cloudinary error', async () => {
      mockReq.user = { role: 'Job Seeker', _id: 'user123' };
      mockReq.files = { resume: mockResume };
      mockReq.body = validApplicationData;

      const mockJob = {
        _id: 'job123',
        title: 'Software Engineer',
        postedBy: 'employer123'
      };

      (Job.findById as jest.Mock).mockResolvedValue(mockJob);
      (cloudinary.uploader.upload as jest.Mock).mockRejectedValue(new Error('Cloudinary error'));

      await postApplication(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('updateApplicationStatus', () => {
    test('should return 403 if user is not employer', async () => {
      mockReq.user = { role: 'Job Seeker' };

      await updateApplicationStatus(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorHandler));
    });

    test('should return 400 if invalid status', async () => {
      mockReq.user = { role: 'Employer', _id: 'employer123' };
      mockReq.body = { status: 'Invalid' };

      await updateApplicationStatus(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorHandler));
    });

    test('should return 404 if application not found', async () => {
      mockReq.user = { role: 'Employer', _id: 'employer123' };
      mockReq.params = { id: 'nonexistent' };
      mockReq.body = { status: 'Accepted' };

      (Application.findById as jest.Mock).mockResolvedValue(null);

      await updateApplicationStatus(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorHandler));
    });

    test('should return 403 if employer not authorized', async () => {
      mockReq.user = { role: 'Employer', _id: 'employer123' };
      mockReq.params = { id: 'app123' };
      mockReq.body = { status: 'Accepted' };

      const mockApplication = {
        _id: 'app123',
        employerID: { user: { toString: () => 'different-employer' } },
        save: jest.fn()
      };

      (Application.findById as jest.Mock).mockResolvedValue(mockApplication);

      await updateApplicationStatus(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorHandler));
    });

    test('should update status successfully', async () => {
      mockReq.user = { role: 'Employer', _id: 'employer123' };
      mockReq.params = { id: 'app123' };
      mockReq.body = { status: 'Accepted' };

      const mockSave = jest.fn().mockResolvedValue(true);
      const mockApplication = {
        _id: 'app123',
        employerID: { user: { toString: () => 'employer123' } },
        applicantID: { user: 'seeker123' },
        jobId: 'job123',
        status: 'Pending',
        save: mockSave
      };

      const mockJob = {
        _id: 'job123',
        title: 'Software Engineer',
        postedBy: { name: 'Company Name' }
      };

      const mockSeeker = {
        _id: 'seeker123',
        email: 'seeker@example.com',
        name: 'John Doe'
      };

      (Application.findById as jest.Mock).mockResolvedValue(mockApplication);
      (Job.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockJob)
      });
      (User.findById as jest.Mock).mockResolvedValue(mockSeeker);

      await updateApplicationStatus(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockApplication.status).toBe('Accepted');
      expect(mockSave).toHaveBeenCalled();
      expect(sendJobStatusEmail).toHaveBeenCalledWith(
        mockSeeker.email,
        mockSeeker.name,
        mockJob.title,
        'Company Name',
        'accepted'
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Application accepted successfully',
        application: mockApplication
      });
    });
  });

  describe('employerGetAllApplications', () => {
    test('should return 400 if user is job seeker', async () => {
      mockReq.user = { role: 'Job Seeker' };

      await employerGetAllApplications(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorHandler));
    });

    test('should return employer applications', async () => {
      mockReq.user = { role: 'Employer', _id: 'employer123' };
      const mockApplications = [{ _id: 'app1' }, { _id: 'app2' }];

      const mockPopulateChain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockApplications)
      };
      (Application.find as jest.Mock).mockReturnValue(mockPopulateChain);

      await employerGetAllApplications(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(Application.find).toHaveBeenCalledWith({ "employerID.user": 'employer123' });
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        applications: mockApplications
      });
    });
  });

  describe('jobseekerGetAllApplications', () => {
    test('should return 400 if user is employer', async () => {
      mockReq.user = { role: 'Employer' };

      await jobseekerGetAllApplications(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorHandler));
    });

    test('should return job seeker applications', async () => {
      mockReq.user = { role: 'Job Seeker', _id: 'seeker123' };
      const mockApplications = [{ _id: 'app1' }, { _id: 'app2' }];

      const mockPopulateChain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockApplications)
      };
      (Application.find as jest.Mock).mockReturnValue(mockPopulateChain);

      await jobseekerGetAllApplications(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(Application.find).toHaveBeenCalledWith({ "applicantID.user": 'seeker123' });
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        applications: mockApplications
      });
    });
  });

  describe('jobseekerDeleteApplication', () => {
    test('should return 400 if user is employer', async () => {
      mockReq.user = { role: 'Employer' };

      await jobseekerDeleteApplication(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorHandler));
    });

    test('should return 404 if application not found', async () => {
      mockReq.user = { role: 'Job Seeker' };
      mockReq.params = { id: 'nonexistent' };

      (Application.findById as jest.Mock).mockResolvedValue(null);

      await jobseekerDeleteApplication(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorHandler));
    });

    test('should delete application successfully', async () => {
      mockReq.user = { role: 'Job Seeker' };
      mockReq.params = { id: 'app123' };

      const mockDeleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
      const mockApplication = {
        _id: 'app123',
        deleteOne: mockDeleteOne
      };

      (Application.findById as jest.Mock).mockResolvedValue(mockApplication);

      await jobseekerDeleteApplication(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockDeleteOne).toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Application Deleted!'
      });
    });
  });
});