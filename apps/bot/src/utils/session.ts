import { type Context } from '@/bot/context';

export function getSessionKey(ctx: Omit<Context, 'session'>) {
  return ctx.chat?.id.toString();
}
