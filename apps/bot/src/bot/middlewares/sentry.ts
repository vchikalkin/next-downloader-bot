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

    const chatType = ctx.chat?.type ?? 'unknown';

    sentrySdk.setTag('chat.type', chatType);
    sentrySdk.metrics.count('bot.update', 1, {
      attributes: { chat_type: chatType },
    });

    await sentrySdk.startSpan({ name: 'telegram.update', op: 'telegram.handle' }, () => next());
  });
};
