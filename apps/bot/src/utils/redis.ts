import { Redis } from 'ioredis';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

function createRedisInstance() {
  const redis = new Redis({
    host: env.REDIS_HOST,
    password: env.REDIS_PASSWORD,
    port: env.REDIS_PORT,
  });

  redis.on('error', logger.error);

  return redis;
}

const instance = createRedisInstance();

export function getRedisInstance() {
  return instance;
}
