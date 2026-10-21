import { performance } from 'node:perf_hooks';
import type { Middleware } from 'grammy';
import type { Context } from '@/bot/context';
import { getUpdateInfo } from '@/bot/helpers/logging';

export const updateLogger: Middleware<Context> = async (ctx, next) => {
  ctx.api.config.use((previous, method, payload, signal) => {
    ctx.logger.debug({
      method,
      msg: 'Bot API call',
      payload,
    });

    return previous(method, payload, signal);
  });

  ctx.logger.debug({
    msg: 'Update received',
    update: getUpdateInfo(ctx),
  });

  const startTime = performance.now();

  try {
    await next();
  } finally {
    ctx.logger.debug({
      elapsed: performance.now() - startTime,
      msg: 'Update processed',
    });
  }
};
