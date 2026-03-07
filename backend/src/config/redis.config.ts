import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    return Math.min(times * 50, 2000);
  }
});

redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
});

process.on('SIGINT', async () => {
  await redis.quit();
  console.log('Redis connection closed');
  process.exit(0);
});

export default redis;