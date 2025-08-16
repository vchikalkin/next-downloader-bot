import { type Context } from '@/bot/context';
import { logHandle } from '@/bot/helpers/logging';
import { Composer } from 'grammy';

const composer = new Composer<Context>();

const feature = composer.chatType('private');

feature.command('start', logHandle('command-start'), (ctx) => {
  return ctx.reply(ctx.t('msg-welcome'));
});

export { composer as welcome };
