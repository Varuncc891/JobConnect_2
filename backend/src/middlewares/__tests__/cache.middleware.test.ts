import { Request, Response, NextFunction } from 'express';
import { cache, clearJobListingsCache, clearSingleJobCache } from '../cache.middleware';
import redis from '../../config/redis.config';

// Mock Redis with proper Promise structure
jest.mock('../../config/redis.config', () => ({
  get: jest.fn(),
  setex: jest.fn().mockReturnValue({
    catch: jest.fn()
  }),
  keys: jest.fn(),
  del: jest.fn()
}));

describe('Cache Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let mockJson: jest.Mock;
  let mockSetHeader: jest.Mock;
  let capturedJson: any;

  beforeEach(() => {
    mockJson = jest.fn().mockReturnThis();
    mockSetHeader = jest.fn();
    mockNext = jest.fn();

    mockReq = {
      method: 'GET',
      originalUrl: '/api/v1/job/getall?page=1&limit=10'
    };

    // Create a res object that allows us to capture when json is overridden
    capturedJson = mockJson;
    mockRes = {
      setHeader: mockSetHeader,
      get json() { return capturedJson; },
      set json(value) { 
        capturedJson = value; 
      },
      statusCode: 200
    } as Partial<Response>;

    jest.clearAllMocks();
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
      
      // Check that the captured json function was called with cachedJobs
      expect(capturedJson).toHaveBeenCalledWith(cachedJobs);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should set MISS header and override json method when no cache', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);

      const originalJson = capturedJson;
      const middleware = cache(300);
      await middleware(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(redis.get).toHaveBeenCalled();
      expect(mockSetHeader).toHaveBeenCalledWith('X-Cache', 'MISS');
      
      // Check that json was overridden
      expect(capturedJson).not.toBe(originalJson);
      expect(mockNext).toHaveBeenCalled();
    });

    test('should cache successful responses', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      
      // Mock setex to return a Promise with catch
      const mockCatch = jest.fn();
      (redis.setex as jest.Mock).mockReturnValue({
        catch: mockCatch
      });

      const middleware = cache(300);
      await middleware(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      // Simulate response being sent using the captured json function
      const responseBody = { success: true, jobs: [] };
      
      if (capturedJson) {
        capturedJson(responseBody);
      }

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
      if (capturedJson) {
        capturedJson({ success: false, message: 'Error' });
      }

      expect(redis.setex).not.toHaveBeenCalled();
    });

    test('should use custom duration', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      
      const mockCatch = jest.fn();
      (redis.setex as jest.Mock).mockReturnValue({
        catch: mockCatch
      });

      const middleware = cache(600); // 10 minutes
      await middleware(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      if (capturedJson) {
        capturedJson({ success: true });
      }

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
      expect(mockSetHeader).not.toHaveBeenCalled();
      expect(capturedJson).not.toHaveBeenCalled();
    });

    test('should handle Redis setex errors gracefully', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      
      const mockCatch = jest.fn().mockImplementation((fn) => {
        fn(new Error('Redis write failed'));
        return { catch: mockCatch };
      });
      
      (redis.setex as jest.Mock).mockReturnValue({
        catch: mockCatch
      });

      const middleware = cache(300);
      await middleware(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      if (capturedJson) {
        capturedJson({ success: true });
      }
      
      // Should not throw
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

      // Should not throw
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

      // Should not throw
      await expect(clearSingleJobCache(jobId)).resolves.not.toThrow();
    });
  });
});