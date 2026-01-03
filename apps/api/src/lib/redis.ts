import Redis from 'ioredis';
import { logger } from '@repo/logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('error', (err) => {
  logger.error('Redis connection error', err);
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

export const checkRedisConnection = async () => {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    return false;
  }
};
