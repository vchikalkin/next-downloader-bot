/* eslint-disable n/callback-return */
import { type Context } from './context';
import * as features from './features';
import { errorHandler } from './handlers/errors';
import { i18n } from './i18n';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { getRedisInstance } from '@/utils/redis';
import { autoChatAction } from '@grammyjs/auto-chat-action';
import { hydrate } from '@grammyjs/hydrate';
import { limit } from '@grammyjs/ratelimiter';
import { Bot } from 'grammy';

type Parameters_ = {
  apiRoot: string;
  token: string;
};

const redis = getRedisInstance();

export function createBot({ apiRoot, token }: Parameters_) {
  const bot = new Bot<Context>(token, {
    client: {
      apiRoot,
    },
  });

  bot.use(i18n);

  bot.use(
    limit({
      keyGenerator: (ctx) => {
        return ctx.from?.id.toString();
      },
      limit: 1,
      onLimitExceeded: async (ctx) => {
        await ctx.reply(ctx.t('limit_exceeded'));
      },
      storageClient: redis,
      timeFrame: env.RATE_LIMIT,
    }),
  );

  bot.use(async (context, next) => {
    context.logger = logger.child({
      update_id: context.update.update_id,
    });

    await next();
  });

  const protectedBot = bot.errorBoundary(errorHandler);

  protectedBot.use(autoChatAction(bot.api));
  protectedBot.use(hydrate());
  protectedBot.use(features.download);

  return bot;
}
