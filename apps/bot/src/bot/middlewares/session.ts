import { type Middleware,session as createSession } from 'grammy';
import { RedisAdapter } from '@grammyjs/storage-redis';
import type { Context } from '@/bot/context';
import { TTL_SESSION } from '@/config/redis';
import { getRedisInstance } from '@/utils/redis';
import { getSessionKey } from '@/utils/session';

const storage = new RedisAdapter({
  autoParseDates: true,
  instance: getRedisInstance(),
  ttl: TTL_SESSION,
});

export function session(): Middleware<Context> {
  return createSession({
    getSessionKey,
    initial: () => ({}),
    storage,
  });
}
