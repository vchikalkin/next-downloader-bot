import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import Redis from 'ioredis';

const instance: Redis = createRedisInstance();

export function getRedisInstance() {
  if (!instance) return createRedisInstance();

  return instance;
}

function createRedisInstance() {
  const redis = new Redis({
    host: env.REDIS_HOST,
    password: env.REDIS_PASSWORD,
    port: env.REDIS_PORT,
  });

  redis.on('error', logger.error);

  return redis;
}
