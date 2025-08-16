/* eslint-disable n/callback-return */
import { setCommands } from './commands';
import { type Context } from './context';
import * as features from './features';
import { errorHandler } from './handlers/errors';
import { i18n } from './i18n';
import * as middlewares from './middlewares';
import { session } from './middlewares';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { getRedisInstance } from '@/utils/redis';
import { getSessionKey } from '@/utils/session';
import { autoChatAction } from '@grammyjs/auto-chat-action';
import { hydrate } from '@grammyjs/hydrate';
import { limit } from '@grammyjs/ratelimiter';
import { sequentialize } from '@grammyjs/runner';
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
      limit: env.RATE_LIMIT,
      onLimitExceeded: async (ctx) => {
        await ctx.reply(ctx.t('err-limit-exceeded'));
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

  const protectedBot = bot.errorBoundary(errorHandler);

  protectedBot.use(sequentialize(getSessionKey));
  protectedBot.use(session());

  protectedBot.use(middlewares.updateLogger());
  protectedBot.use(setCommands);
  protectedBot.use(autoChatAction(bot.api));
  protectedBot.use(hydrate());
  protectedBot.use(features.welcome);
  protectedBot.use(features.download);

  return bot;
}
