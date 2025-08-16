import { type Context } from '@/bot/context';
import { TTL_SESSION } from '@/config/redis';
import { getRedisInstance } from '@/utils/redis';
import { getSessionKey } from '@/utils/session';
import { RedisAdapter } from '@grammyjs/storage-redis';
import { session as createSession, type Middleware } from 'grammy';

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
