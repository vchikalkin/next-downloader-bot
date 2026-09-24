import { Composer } from 'grammy';
import type { Context } from '@/bot/context';
import { logHandle } from '@/bot/helpers/logging';
import { MSG_WELCOME } from '@/constants/i18n';

const composer = new Composer<Context>();

const feature = composer.chatType('private');

feature.command('start', logHandle('command-start'), (ctx) => 
  ctx.reply(ctx.t(MSG_WELCOME))
);

export { composer as welcome };
