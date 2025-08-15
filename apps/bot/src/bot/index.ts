/* eslint-disable n/callback-return */
import { type Context } from './context';
import * as features from './features';
import { errorHandler } from './handlers/errors';
import { i18n } from './i18n';
import { logger } from '@/utils/logger';
import { autoChatAction } from '@grammyjs/auto-chat-action';
import { hydrate } from '@grammyjs/hydrate';
import { Bot } from 'grammy';

type Parameters_ = {
  apiRoot: string;
  token: string;
};

export function createBot({ apiRoot, token }: Parameters_) {
  const bot = new Bot<Context>(token, {
    client: {
      apiRoot,
    },
  });

  bot.use(async (context, next) => {
    context.logger = logger.child({
      update_id: context.update.update_id,
    });

    await next();
  });

  const protectedBot = bot.errorBoundary(errorHandler);

  protectedBot.use(i18n);
  protectedBot.use(autoChatAction(bot.api));
  protectedBot.use(hydrate());
  protectedBot.use(features.download);

  return bot;
}
