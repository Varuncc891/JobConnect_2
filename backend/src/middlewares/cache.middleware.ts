import { Request, Response, NextFunction } from 'express';
import redis from '../config/redis.config';

/** Cache middleware for GET requests. Duration is TTL in seconds (default: 300). */
export const cache = (duration: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `jobs:${req.originalUrl}`;

    try {
      const cachedData = await redis.get(key);

      if (cachedData) {
        res.setHeader('X-Cache', 'HIT');
        return res.status(200).json(JSON.parse(cachedData));
      }

      res.setHeader('X-Cache', 'MISS');

      const originalJson = res.json;

      res.json = function (body) {
        if (res.statusCode === 200) {
          redis.setex(key, duration, JSON.stringify(body)).catch((err) => {
            console.error('Failed to cache response:', err);
          });
        }
        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      console.error('Redis cache error:', error);
      next();
    }
  };
};

/** Clears all job listing caches. Call when jobs are created, updated, or deleted. */
export const clearJobListingsCache = async (): Promise<void> => {
  try {
    const keys = await redis.keys('jobs:*');
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
};

/** Clears the cache for a specific job by ID. */
export const clearSingleJobCache = async (jobId: string): Promise<void> => {
  try {
    await redis.del(`job:${jobId}`);
  } catch (error) {
    console.error('Failed to clear single job cache:', error);
  }
};