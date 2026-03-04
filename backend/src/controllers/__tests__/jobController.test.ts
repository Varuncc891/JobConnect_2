import { Request, Response, NextFunction } from 'express';
import { getAllJobs, postJob, getMyJobs, updateJob, deleteJob, getSingleJob } from '../jobController';
import { Job } from '../../models/job.model';
import ErrorHandler from '../../middlewares/error';
import { clearJobListingsCache, clearSingleJobCache } from '../../middlewares/cache.middleware';

// Mock dependencies
jest.mock('../../models/job.model');
jest.mock('../../middlewares/cache.middleware');

// Mock the clear cache functions to resolve immediately
(clearJobListingsCache as jest.Mock).mockResolvedValue(undefined);
(clearSingleJobCache as jest.Mock).mockResolvedValue(undefined);

interface RequestWithUser extends Request {
  user?: any;
}

describe('Job Controller', () => {
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
      query: {},
      params: {},
      body: {},
      user: null
    };

    mockRes = {
      json: mockJson,
      status: mockStatus
    };

    jest.clearAllMocks();
  });

  describe('getAllJobs', () => {
    const mockJobs = [
      { _id: '1', title: 'Job 1', postedBy: { name: 'Employer 1' } },
      { _id: '2', title: 'Job 2', postedBy: { name: 'Employer 2' } }
    ];

    beforeEach(() => {
      // Mock the chain properly
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockJobs)
      };

      (Job.find as jest.Mock).mockReturnValue(mockQuery);
      (Job.countDocuments as jest.Mock).mockResolvedValue(10);
    });

    test('should return jobs with default pagination', async () => {
      await getAllJobs(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          jobs: mockJobs,
          pagination: expect.objectContaining({
            currentPage: 1
          })
        })
      );
    });

    test('should apply category filter', async () => {
      mockReq.query = { category: 'Engineering' };

      await getAllJobs(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(Job.find).toHaveBeenCalledWith({
        expired: false,
        category: { $regex: 'Engineering', $options: 'i' }
      });
    });

    test('should apply salary filters', async () => {
      mockReq.query = { minSalary: '50000', maxSalary: '100000' };

      await getAllJobs(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(Job.find).toHaveBeenCalledWith({
        expired: false,
        $or: expect.arrayContaining([
          { fixedSalary: { $gte: 50000 } },
          { salaryFrom: { $gte: 50000 } },
          { salaryTo: { $gte: 50000 } },
          { fixedSalary: { $lte: 100000 } },
          { salaryFrom: { $lte: 100000 } },
          { salaryTo: { $lte: 100000 } }
        ])
      });
    });

    test('should handle pagination', async () => {
      mockReq.query = { page: '2', limit: '10' };
      (Job.countDocuments as jest.Mock).mockResolvedValue(25);

      await getAllJobs(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({
            currentPage: 2,
            totalPages: 3,
            hasNextPage: true,
            hasPrevPage: true,
            nextPage: 3,
            prevPage: 1
          })
        })
      );
    });
  });

  describe('postJob', () => {
    const validJobData = {
      title: 'Software Engineer',
      description: 'Great job opportunity',
      category: 'Engineering',
      country: 'USA',
      city: 'San Francisco',
      location: 'San Francisco, CA',
      fixedSalary: 100000
    };

    test('should return 400 if user is job seeker', async () => {
      mockReq.user = { role: 'Job Seeker' };

      await postJob(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorHandler));
    });

    test('should return 400 if required fields missing', async () => {
      mockReq.user = { role: 'Employer' };
      mockReq.body = { title: 'Job' }; // missing fields

      await postJob(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorHandler));
    });

    test('should create job and clear cache with valid data', async () => {
      mockReq.user = { role: 'Employer', _id: 'employer123' };
      mockReq.body = validJobData;

      const mockCreatedJob = {
        ...validJobData,
        _id: 'job123',
        postedBy: 'employer123'
      };
      (Job.create as jest.Mock).mockResolvedValue(mockCreatedJob);

      await postJob(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(Job.create).toHaveBeenCalledWith({
        ...validJobData,
        postedBy: 'employer123'
      });
      expect(clearJobListingsCache).toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Job Posted Successfully!',
        job: mockCreatedJob
      });
    });
  });

  describe('getMyJobs', () => {
    test('should return 400 if user is job seeker', async () => {
      mockReq.user = { role: 'Job Seeker' };

      await getMyJobs(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorHandler));
    });

    test('should return employer jobs', async () => {
      mockReq.user = { role: 'Employer', _id: 'employer123' };
      const mockJobs = [{ title: 'Job 1' }, { title: 'Job 2' }];
      (Job.find as jest.Mock).mockResolvedValue(mockJobs);

      await getMyJobs(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(Job.find).toHaveBeenCalledWith({ postedBy: 'employer123' });
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        myJobs: mockJobs
      });
    });
  });

  describe('updateJob', () => {
    test('should return 400 if user is job seeker', async () => {
      mockReq.user = { role: 'Job Seeker' };

      await updateJob(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorHandler));
    });

    test('should return 404 if job not found', async () => {
      mockReq.user = { role: 'Employer' };
      mockReq.params = { id: 'nonexistent' };
      (Job.findById as jest.Mock).mockResolvedValue(null);

      await updateJob(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorHandler));
    });

    test('should update job and clear cache', async () => {
      mockReq.user = { role: 'Employer' };
      mockReq.params = { id: 'job123' };
      mockReq.body = { title: 'Updated Title' };

      const mockJob = { _id: 'job123', title: 'Old Title' };
      const mockUpdatedJob = { _id: 'job123', title: 'Updated Title' };

      (Job.findById as jest.Mock).mockResolvedValue(mockJob);
      (Job.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedJob);

      await updateJob(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(Job.findByIdAndUpdate).toHaveBeenCalledWith(
        'job123',
        { title: 'Updated Title' },
        { new: true, runValidators: true, useFindAndModify: false }
      );
      expect(clearJobListingsCache).toHaveBeenCalled();
      expect(clearSingleJobCache).toHaveBeenCalledWith('job123');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Job Updated!'
      });
    });
  });

  describe('deleteJob', () => {
    test('should return 400 if user is job seeker', async () => {
      mockReq.user = { role: 'Job Seeker' };

      await deleteJob(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorHandler));
    });

    test('should return 404 if job not found', async () => {
      mockReq.user = { role: 'Employer' };
      mockReq.params = { id: 'nonexistent' };
      (Job.findById as jest.Mock).mockResolvedValue(null);

      await deleteJob(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorHandler));
    });

    test('should delete job and clear cache', async () => {
      mockReq.user = { role: 'Employer' };
      mockReq.params = { id: 'job123' };

      const mockDelete = jest.fn().mockResolvedValue(undefined);
      const mockJob = { 
        _id: 'job123', 
        deleteOne: mockDelete 
      };

      (Job.findById as jest.Mock).mockResolvedValue(mockJob);

      await deleteJob(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockDelete).toHaveBeenCalled();
      expect(clearJobListingsCache).toHaveBeenCalled();
      expect(clearSingleJobCache).toHaveBeenCalledWith('job123');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Job Deleted!'
      });
    });
  });

  describe('getSingleJob', () => {
    test('should return 404 if job not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      (Job.findById as jest.Mock).mockResolvedValue(null);

      await getSingleJob(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorHandler));
    });

    test('should return job if found', async () => {
      mockReq.params = { id: 'job123' };
      const mockJob = { _id: 'job123', title: 'Test Job' };
      (Job.findById as jest.Mock).mockResolvedValue(mockJob);

      await getSingleJob(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(Job.findById).toHaveBeenCalledWith('job123');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        job: mockJob
      });
    });

    test('should handle CastError', async () => {
      mockReq.params = { id: 'invalid-id' };
      (Job.findById as jest.Mock).mockRejectedValue(new Error('CastError'));

      await getSingleJob(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorHandler));
    });
  });
});