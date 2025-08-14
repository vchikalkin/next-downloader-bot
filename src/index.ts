import { env } from './config/env';
import { Downloader } from '@tobyg74/tiktok-api-dl';
import { Telegraf as Bot } from 'telegraf';
import { message } from 'telegraf/filters';

const bot = new Bot(env.BOT_TOKEN, {
  telegram: {
    apiRoot: env.TELEGRAM_API_ROOT,
  },
});

bot.on(message('text'), async (ctx) => {
  try {
    const url = ctx.message.text;

    const { result, message } = await Downloader(url, {
      version: 'v3',
    });

    if (message) throw new Error(message);

    const videoUrl = result?.videoHD || result?.videoSD || result?.videoWatermark;
    const imagesUrls = result?.images;

    if (result?.type === 'video' && videoUrl) {
      return ctx.replyWithVideo({
        url: videoUrl,
      });
    }

    if (result?.type === 'image' && imagesUrls) {
      return ctx.replyWithMediaGroup(imagesUrls.map((image) => ({ media: image, type: 'photo' })));
    }
  } catch (error) {
    const err_ = error as Error;

    return ctx.reply(err_.message);
  }
});

bot.launch();
