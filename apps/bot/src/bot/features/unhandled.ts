import { type Context } from '@/bot/context';
import { logHandle } from '@/bot/helpers/logging';
import { Composer } from 'grammy';

const composer = new Composer<Context>();

const feature = composer.chatType('private');

feature.on('message', logHandle('unhandled-message'), (ctx) => {
  return ctx.reply(ctx.t('msg-unhandled'));
});

feature.on('callback_query', logHandle('unhandled-callback-query'), (ctx) => {
  return ctx.answerCallbackQuery();
});

export { composer as unhandledFeature };
