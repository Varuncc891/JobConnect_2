import { Request, Response, NextFunction } from 'express';
import { cache, clearJobListingsCache, clearSingleJobCache } from '../cache.middleware';
import redis from '../../config/redis.config';

jest.mock('../../config/redis.config', () => ({
  get: jest.fn(),
  setex: jest.fn().mockResolvedValue('OK'),
  keys: jest.fn(),
  del: jest.fn()
}));

describe('Cache Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: any;
  let mockNext: jest.Mock;
  let mockSetHeader: jest.Mock;
  let mockStatus: jest.Mock;
  let mockJson: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn().mockReturnThis();
    mockSetHeader = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    mockNext = jest.fn();

    mockReq = {
      method: 'GET',
      originalUrl: '/api/v1/job/getall?page=1&limit=10'
    };

    // res object with statusCode property (the middleware checks res.statusCode)
    mockRes = {
      setHeader: mockSetHeader,
      status: mockStatus,
      json: mockJson,
      statusCode: 200,
    };

    jest.clearAllMocks();
    // Re-apply after clearAllMocks
    (redis.setex as jest.Mock).mockResolvedValue('OK');
  });

  describe('cache middleware', () => {
    test('should skip caching for non-GET requests', async () => {
      mockReq.method = 'POST';

      const middleware = cache(300);
      await middleware(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(redis.get).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    test('should return cached data if available', async () => {
      const cachedJobs = {
        success: true,
        jobs: [{ title: 'Job 1' }, { title: 'Job 2' }]
      };

      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedJobs));

      const middleware = cache(300);
      await middleware(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(redis.get).toHaveBeenCalledWith('jobs:/api/v1/job/getall?page=1&limit=10');
      expect(mockSetHeader).toHaveBeenCalledWith('X-Cache', 'HIT');
      // Cache HIT: controller calls res.status(200).json(parsed)
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(cachedJobs);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should set MISS header and override json method when no cache', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);

      const originalJson = mockRes.json;
      const middleware = cache(300);
      await middleware(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(redis.get).toHaveBeenCalled();
      expect(mockSetHeader).toHaveBeenCalledWith('X-Cache', 'MISS');
      // json should have been replaced by the middleware
      expect(mockRes.json).not.toBe(originalJson);
      expect(mockNext).toHaveBeenCalled();
    });

    test('should cache successful responses', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (redis.setex as jest.Mock).mockResolvedValue('OK');

      const middleware = cache(300);
      await middleware(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      // Call the overridden json to trigger caching
      const responseBody = { success: true, jobs: [] };
      mockRes.json(responseBody);

      expect(redis.setex).toHaveBeenCalledWith(
        'jobs:/api/v1/job/getall?page=1&limit=10',
        300,
        JSON.stringify(responseBody)
      );
    });

    test('should not cache error responses', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);

      const middleware = cache(300);
      await middleware(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      // Simulate error response
      mockRes.statusCode = 400;
      mockRes.json({ success: false, message: 'Error' });

      expect(redis.setex).not.toHaveBeenCalled();
    });

    test('should use custom duration', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (redis.setex as jest.Mock).mockResolvedValue('OK');

      const middleware = cache(600);
      await middleware(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      mockRes.json({ success: true });

      expect(redis.setex).toHaveBeenCalledWith(
        expect.any(String),
        600,
        expect.any(String)
      );
    });

    test('should handle Redis get errors gracefully', async () => {
      (redis.get as jest.Mock).mockRejectedValue(new Error('Redis connection failed'));

      const middleware = cache(300);
      await middleware(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalled();
      // On error it falls through to next() without setting headers
      expect(mockSetHeader).not.toHaveBeenCalled();
    });

    test('should handle Redis setex errors gracefully', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (redis.setex as jest.Mock).mockRejectedValue(new Error('Redis write failed'));

      const middleware = cache(300);
      await middleware(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      // Call overridden json — setex will fail but should not throw
      mockRes.json({ success: true });

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('clearJobListingsCache', () => {
    test('should clear all job listing caches', async () => {
      const mockKeys = ['jobs:page1', 'jobs:page2', 'jobs:filtered'];
      (redis.keys as jest.Mock).mockResolvedValue(mockKeys);
      (redis.del as jest.Mock).mockResolvedValue(3);

      await clearJobListingsCache();

      expect(redis.keys).toHaveBeenCalledWith('jobs:*');
      expect(redis.del).toHaveBeenCalledWith(mockKeys);
    });

    test('should not call del if no keys found', async () => {
      (redis.keys as jest.Mock).mockResolvedValue([]);

      await clearJobListingsCache();

      expect(redis.keys).toHaveBeenCalledWith('jobs:*');
      expect(redis.del).not.toHaveBeenCalled();
    });

    test('should handle Redis errors gracefully', async () => {
      (redis.keys as jest.Mock).mockRejectedValue(new Error('Redis error'));

      await expect(clearJobListingsCache()).resolves.not.toThrow();
    });
  });

  describe('clearSingleJobCache', () => {
    test('should clear cache for specific job', async () => {
      const jobId = '507f1f77bcf86cd799439011';
      (redis.del as jest.Mock).mockResolvedValue(1);

      await clearSingleJobCache(jobId);

      expect(redis.del).toHaveBeenCalledWith(`job:${jobId}`);
    });

    test('should handle Redis errors gracefully', async () => {
      const jobId = '507f1f77bcf86cd799439011';
      (redis.del as jest.Mock).mockRejectedValue(new Error('Redis error'));

      await expect(clearSingleJobCache(jobId)).resolves.not.toThrow();
    });
  });
});