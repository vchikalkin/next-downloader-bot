import { Bot } from 'grammy';
import { logger } from '@/utils/logger';
import { Context } from './context';
import { i18n } from './i18n';
import { errorHandler } from './handlers/errors';
import * as features from './features';
import { hydrate } from '@grammyjs/hydrate';
import { autoChatAction } from '@grammyjs/auto-chat-action';

type Params = {
  token: string;
  apiRoot: string;
};

export function createBot({ token, apiRoot }: Params) {
  const bot = new Bot<Context>(token, {
    client: {
      apiRoot,
    },
  });

  bot.use(async (ctx, next) => {
    ctx.logger = logger.child({
      update_id: ctx.update.update_id,
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
