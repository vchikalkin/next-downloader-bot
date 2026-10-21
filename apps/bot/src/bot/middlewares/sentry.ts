import type { Middleware } from 'grammy';
import * as sentrySdk from '@sentry/node';
import type { Context } from '@/bot/context';

export const sentry: Middleware<Context> = async (ctx, next) => {
  await sentrySdk.withIsolationScope(async () => {
    if (ctx.from) {
      sentrySdk.setUser({
        id: String(ctx.from.id),
        ...(ctx.from.username ? { username: ctx.from.username } : {}),
      });
    }

    sentrySdk.metrics.count('bot.update');

    await sentrySdk.startSpan({ name: 'telegram.update', op: 'telegram.handle' }, () => next());
  });
};
