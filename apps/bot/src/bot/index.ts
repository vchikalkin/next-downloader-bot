import { Bot } from 'grammy';
import { autoChatAction } from '@grammyjs/auto-chat-action';
import { hydrate } from '@grammyjs/hydrate';
import { limit } from '@grammyjs/ratelimiter';
import { env } from '@/config/env';
import { ERR_LIMIT_EXCEEDED } from '@/constants/i18n';
import { logger } from '@/utils/logger';
import { getRedisInstance } from '@/utils/redis';
import type { Context } from './context';
import * as features from './features';
import { errorHandler } from './handlers/errors';
import { i18n } from './i18n';
import * as middlewares from './middlewares';
import { setCommands } from './settings/commands';
import { setInfo } from './settings/info';

interface CreateBotOptions {
  apiRoot: string;
  token: string;
}

const redis = getRedisInstance();

export function createBot({ apiRoot, token }: CreateBotOptions) {
  const bot = new Bot<Context>(token, {
    client: {
      apiRoot,
    },
  });

  bot.use(i18n);

  bot.use(
    limit({
      keyGenerator: (ctx) => ctx.from?.id.toString(),
      limit: env.RATE_LIMIT,
      onLimitExceeded: (ctx) => {
        ctx.reply(ctx.t(ERR_LIMIT_EXCEEDED)).catch(() => undefined);
      },
      storageClient: redis,
      timeFrame: env.RATE_LIMIT_TIME,
    }),
  );

  bot.use(async (context, next) => {
    context.logger = logger.child({
      update_id: context.update.update_id,
    });
    await next();
  });

  setInfo(bot).catch((error: unknown) => {
    logger.error(error);
  });
  setCommands(bot).catch((error: unknown) => {
    logger.error(error);
  });

  const protectedBot = bot.errorBoundary(errorHandler);

  protectedBot.use(middlewares.updateLogger());
  protectedBot.use(autoChatAction(bot.api));
  protectedBot.use(hydrate());

  protectedBot.use(features.welcome);
  protectedBot.use(features.download);
  protectedBot.use(features.unhandled);

  return bot;
}
