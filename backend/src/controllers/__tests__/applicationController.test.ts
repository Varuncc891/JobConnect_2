import { Request, Response, NextFunction } from 'express';
import { postApplication, updateApplicationStatus, employerGetAllApplications, jobseekerGetAllApplications, jobseekerDeleteApplication } from '../applicationController';
import { Application } from '../../models/application.model';
import { Job } from '../../models/job.model';
import { User } from '../../models/user.model';
import ErrorHandler from '../../middlewares/error';
import { v2 as cloudinary } from 'cloudinary';
import { notifyEmployer } from '../sseController';
import { sendJobStatusEmail } from '../../services/email.service';

// Mock dependencies
jest.mock('../../models/application.model');
jest.mock('../../models/job.model');
jest.mock('../../models/user.model');
jest.mock('cloudinary');
jest.mock('../sseController');
jest.mock('../../services/email.service');

// Mock the functions
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
      mockReq.body = { jobId: 'nonexistent' };

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
        postedBy: 'employer123'
      };

      (Job.findById as jest.Mock).mockResolvedValue(mockJob);
      (cloudinary.uploader.upload as jest.Mock).mockResolvedValue(mockCloudinaryResponse);

      const mockApplication = {
        _id: 'app123',
        ...validApplicationData,
        jobId: 'job123',
        applicantID: { user: 'user123', role: 'Job Seeker' },
        employerID: { user: 'employer123', role: 'Employer' },
        resume: mockCloudinaryResponse,
        status: 'Pending'
      };

      (Application.create as jest.Mock).mockResolvedValue(mockApplication);

      await postApplication(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(cloudinary.uploader.upload).toHaveBeenCalled();
      expect(Application.create).toHaveBeenCalled();
      expect(notifyEmployer).toHaveBeenCalledWith('employer123', expect.any(Object));
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Application Submitted!',
        application: mockApplication
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
        employerID: { user: 'different-employer' },
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

      const mockApplication = {
        _id: 'app123',
        employerID: { user: 'employer123' },
        applicantID: { user: 'seeker123' },
        jobId: 'job123',
        status: 'Pending',
        save: jest.fn().mockResolvedValue(true)
      };

      const mockJob = {
        _id: 'job123',
        title: 'Software Engineer',
        postedBy: { name: 'Company Name' }
      };

      const mockSeeker = {
        email: 'seeker@example.com',
        name: 'John Doe'
      };

      (Application.findById as jest.Mock).mockResolvedValue(mockApplication);
      (Job.findById as jest.Mock).mockResolvedValue(mockJob);
      (User.findById as jest.Mock).mockResolvedValue(mockSeeker);

      await updateApplicationStatus(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockApplication.save).toHaveBeenCalled();
      expect(sendJobStatusEmail).toHaveBeenCalled();
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

      const mockQuery = {
        sort: jest.fn().mockResolvedValue(mockApplications)
      };
      (Application.find as jest.Mock).mockReturnValue(mockQuery);

      await employerGetAllApplications(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(Application.find).toHaveBeenCalledWith({ "employerID.user": 'employer123' });
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
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

      const mockQuery = {
        sort: jest.fn().mockResolvedValue(mockApplications)
      };
      (Application.find as jest.Mock).mockReturnValue(mockQuery);

      await jobseekerGetAllApplications(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(Application.find).toHaveBeenCalledWith({ "applicantID.user": 'seeker123' });
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
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

      const mockDelete = jest.fn().mockResolvedValue(undefined);
      const mockApplication = {
        _id: 'app123',
        deleteOne: mockDelete
      };

      (Application.findById as jest.Mock).mockResolvedValue(mockApplication);

      await jobseekerDeleteApplication(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockDelete).toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Application Deleted!'
      });
    });
  });
});