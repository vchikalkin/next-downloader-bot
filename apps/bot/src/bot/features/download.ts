/* eslint-disable consistent-return */
import { type Context } from '../context';
import { logHandle } from '../helpers/logging';
import { validateTikTokUrl } from '@/utils/urls';
import { Downloader } from '@tobyg74/tiktok-api-dl';
import { Composer, InputFile } from 'grammy';

const composer = new Composer<Context>();

const feature = composer.chatType('private');

feature.on('message:text', logHandle('download-message'), async (context) => {
  try {
    const url = context.message.text;

    if (!validateTikTokUrl(url)) return context.reply(context.t('invalid_url'));

    const { message, result } = await Downloader(url, { version: 'v3' });

    if (message) throw new Error(message);

    const videoUrl = result?.videoHD || result?.videoSD || result?.videoWatermark;
    const imagesUrls = result?.images;

    if (!videoUrl && !imagesUrls?.length) {
      return context.reply(context.t('invalid_download_urls'));
    }

    if (result?.type === 'video' && videoUrl) {
      return context.replyWithVideo(new InputFile({ url: videoUrl }));
    }

    if (result?.type === 'image' && imagesUrls) {
      return context.replyWithMediaGroup(
        imagesUrls.map((image) => ({ media: image, type: 'photo' })),
      );
    }
  } catch (error) {
    context.logger.error(error);

    return context.reply(context.t('generic'));
  }
});

export { composer as download };
