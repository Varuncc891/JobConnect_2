import { Request } from 'express';

/** Returns cache key for job listings based on the full request URL. */
export const getJobListingsCacheKey = (req: Request): string => {
  return `jobs:${req.originalUrl}`;
};

/** Returns cache key for a single job by ID. */
export const getSingleJobCacheKey = (jobId: string): string => {
  return `job:${jobId}`;
};

/** Pattern to match all job listing caches (used for bulk invalidation). */
export const JOB_LISTINGS_PATTERN = 'jobs:*';

/** Pattern to match job caches for a specific city. */
export const getCityJobListingsPattern = (city: string): string => {
  return `jobs:*${city}*`;
};