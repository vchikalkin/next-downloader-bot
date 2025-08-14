import { env } from './config/env';
import { Downloader } from '@tobyg74/tiktok-api-dl';
import { Bot, InputFile } from 'grammy';
import { logger } from './utils/logger';
import { ERROR_MESSAGES } from './constants/messages';
import { validateTikTokUrl } from './utils/urls';

const bot = new Bot(env.BOT_TOKEN, {
  client: {
    apiRoot: env.TELEGRAM_API_ROOT,
  },
});

bot.on('message:text', async (ctx) => {
  try {
    const url = ctx.message.text;

    if (!validateTikTokUrl(url)) return ctx.reply(ERROR_MESSAGES.INVALID_URL);

    const { result, message } = await Downloader(url, { version: 'v3' });

    if (message) throw new Error(message);

    const videoUrl = result?.videoHD || result?.videoSD || result?.videoWatermark;
    const imagesUrls = result?.images;

    if (!videoUrl && !imagesUrls?.length) {
      return ctx.reply(ERROR_MESSAGES.INVALID_DOWNLOAD_URLS);
    }

    if (result?.type === 'video' && videoUrl) {
      return ctx.replyWithVideo(new InputFile({ url: videoUrl }));
    }

    if (result?.type === 'image' && imagesUrls) {
      return ctx.replyWithMediaGroup(imagesUrls.map((image) => ({ media: image, type: 'photo' })));
    }
  } catch (error) {
    logger.error(error);

    return ctx.reply(ERROR_MESSAGES.GENERIC);
  }
});

// Stopping the bot when the Node.js process
// is about to be terminated
process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());

bot.start({
  onStart: (bot) => logger.info(`Bot ${bot.username} started`),
});
