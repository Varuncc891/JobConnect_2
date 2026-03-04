import { Request } from 'express';
import {
  getJobListingsCacheKey,
  getSingleJobCacheKey,
  JOB_LISTINGS_PATTERN,
  getCityJobListingsPattern
} from '../cacheKeys';

describe('Cache Keys Utility', () => {
  describe('getJobListingsCacheKey', () => {
    test('should create cache key from request originalUrl', () => {
      const mockReq = {
        originalUrl: '/api/v1/job/getall?page=1&limit=10&city=Mumbai'
      } as Request;
      
      const key = getJobListingsCacheKey(mockReq);
      expect(key).toBe('jobs:/api/v1/job/getall?page=1&limit=10&city=Mumbai');
    });

    test('should handle request with no query params', () => {
      const mockReq = {
        originalUrl: '/api/v1/job/getall'
      } as Request;
      
      const key = getJobListingsCacheKey(mockReq);
      expect(key).toBe('jobs:/api/v1/job/getall');
    });
  });

  describe('getSingleJobCacheKey', () => {
    test('should create cache key for single job', () => {
      const key = getSingleJobCacheKey('507f1f77bcf86cd799439011');
      expect(key).toBe('job:507f1f77bcf86cd799439011');
    });

    test('should handle empty jobId', () => {
      const key = getSingleJobCacheKey('');
      expect(key).toBe('job:');
    });
  });

  describe('JOB_LISTINGS_PATTERN', () => {
    test('should have correct pattern for all job listings', () => {
      expect(JOB_LISTINGS_PATTERN).toBe('jobs:*');
    });
  });

  describe('getCityJobListingsPattern', () => {
    test('should create pattern for city-specific jobs', () => {
      const pattern = getCityJobListingsPattern('Mumbai');
      expect(pattern).toBe('jobs:*Mumbai*');
    });

    test('should handle city names with spaces', () => {
      const pattern = getCityJobListingsPattern('New York');
      expect(pattern).toBe('jobs:*New York*');
    });
  });
});