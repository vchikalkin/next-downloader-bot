import { env } from './config/env';
import { Downloader } from '@tobyg74/tiktok-api-dl';
import { Bot, Context, InputFile } from 'grammy';
import { logger } from './utils/logger';
import { validateTikTokUrl } from './utils/urls';
import { I18n, I18nFlavor } from '@grammyjs/i18n';

type MyContext = Context & I18nFlavor;

const bot = new Bot<MyContext>(env.BOT_TOKEN, {
  client: {
    apiRoot: env.TELEGRAM_API_ROOT,
  },
});

const i18n = new I18n<MyContext>({
  defaultLocale: 'en', // see below for more information
  directory: 'locales', // Load all translation files from locales/.
});

bot.use(i18n);

bot.on('message:text', async (ctx) => {
  try {
    const url = ctx.message.text;

    if (!validateTikTokUrl(url)) return ctx.reply(ctx.t('invalid_url'));

    const { result, message } = await Downloader(url, { version: 'v3' });

    if (message) throw new Error(message);

    const videoUrl = result?.videoHD || result?.videoSD || result?.videoWatermark;
    const imagesUrls = result?.images;

    if (!videoUrl && !imagesUrls?.length) {
      return ctx.reply(ctx.t('invalid_download_urls'));
    }

    if (result?.type === 'video' && videoUrl) {
      await ctx.replyWithChatAction('upload_video');
      return ctx.replyWithVideo(new InputFile({ url: videoUrl }));
    }

    if (result?.type === 'image' && imagesUrls) {
      await ctx.replyWithChatAction('upload_photo');
      return ctx.replyWithMediaGroup(imagesUrls.map((image) => ({ media: image, type: 'photo' })));
    }
  } catch (error) {
    logger.error(error);

    return ctx.reply(ctx.t('generic'));
  }
});

// Stopping the bot when the Node.js process
// is about to be terminated
process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());

bot.start({
  onStart: (bot) => logger.info(`Bot ${bot.username} started`),
});
