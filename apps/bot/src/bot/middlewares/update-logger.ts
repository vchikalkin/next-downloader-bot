import { type Context } from '@/bot/context';
import { getUpdateInfo } from '@/bot/helpers/logging';
import { type Middleware } from 'grammy';
import { performance } from 'node:perf_hooks';

export function updateLogger(): Middleware<Context> {
  return async (ctx, next) => {
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
      return next();
    } finally {
      const endTime = performance.now();
      ctx.logger.debug({
        elapsed: endTime - startTime,
        msg: 'Update processed',
      });
    }
  };
}
