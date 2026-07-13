import { performance } from 'node:perf_hooks';
import type { Middleware } from 'grammy';
import type { Context } from '@/bot/context';
import { getUpdateInfo } from '@/bot/helpers/logging';

async function updateLoggerMiddleware(ctx: Context, next: () => Promise<void>) {
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

 return;
  } finally {
    const endTime = performance.now();

    ctx.logger.debug({
      elapsed: endTime - startTime,
      msg: 'Update processed',
    });
  }
}

export function updateLogger(): Middleware<Context> {
  return updateLoggerMiddleware;
}
