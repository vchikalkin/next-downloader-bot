import { env } from './config/env';
import { Downloader } from '@tobyg74/tiktok-api-dl';
import { Telegraf as Bot } from 'telegraf';
import { message } from 'telegraf/filters';
import { logger } from './utils/logger';
import { ERROR_MESSAGES } from './constants/messages';
import { validateTikTokUrl } from './utils/urls';

const bot = new Bot(env.BOT_TOKEN, {
  telegram: {
    apiRoot: env.TELEGRAM_API_ROOT,
  },
});

bot.on(message('text'), async (ctx) => {
  try {
    const url = ctx.message.text;

    if (!validateTikTokUrl(url)) return ctx.reply(ERROR_MESSAGES.INVALID_URL);

    const { result, message } = await Downloader(url, {
      version: 'v3',
    });

    if (message) throw new Error(message);

    const videoUrl = result?.videoHD || result?.videoSD || result?.videoWatermark;
    const imagesUrls = result?.images;

    if (!videoUrl && !imagesUrls?.length) {
      return ctx.reply(ERROR_MESSAGES.INVALID_DOWNLOAD_URLS);
    }

    if (result?.type === 'video' && videoUrl) {
      return ctx.replyWithVideo({
        url: videoUrl,
      });
    }

    if (result?.type === 'image' && imagesUrls) {
      return ctx.replyWithMediaGroup(imagesUrls.map((image) => ({ media: image, type: 'photo' })));
    }
  } catch (error) {
    logger.error(error);

    return ctx.reply(ERROR_MESSAGES.GENERIC);
  }
});

bot.launch(() => logger.info('Bot started'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
