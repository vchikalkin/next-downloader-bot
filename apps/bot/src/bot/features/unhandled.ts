import { Composer } from 'grammy';
import type { Context } from '@/bot/context';
import { logHandle } from '@/bot/helpers/logging';
import { MSG_UNHANDLED } from '@/constants/i18n';

const composer = new Composer<Context>();

const feature = composer.chatType('private');

feature.on('message', logHandle('unhandled-message'), (ctx) => 
  ctx.reply(ctx.t(MSG_UNHANDLED))
);

feature.on('callback_query', logHandle('unhandled-callback-query'), (ctx) => 
  ctx.answerCallbackQuery()
);

export { composer as unhandled };
