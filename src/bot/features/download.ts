import { validateTikTokUrl } from '@/utils/urls';
import type { Context } from '../context';
import { logHandle } from '../helpers/logging';
import { Composer, InputFile } from 'grammy';
import { Downloader } from '@tobyg74/tiktok-api-dl';

const composer = new Composer<Context>();

const feature = composer.chatType('private');

feature.on('message:text', logHandle('download-message'), async (ctx) => {
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
      return ctx.replyWithVideo(new InputFile({ url: videoUrl }));
    }

    if (result?.type === 'image' && imagesUrls) {
      return ctx.replyWithMediaGroup(imagesUrls.map((image) => ({ media: image, type: 'photo' })));
    }
  } catch (error) {
    ctx.logger.error(error);

    return ctx.reply(ctx.t('generic'));
  }
});

export { composer as download };
