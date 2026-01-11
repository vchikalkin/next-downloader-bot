/* eslint-disable consistent-return */
import { type Context } from '../context';
import { logHandle } from '../helpers/logging';
import { TTL_URLS } from '@/config/redis';
import { getRedisInstance } from '@/utils/redis';
import { getTiktokDownloadUrl } from '@/utils/tiktok';
import { getInstagramDownloadUrl } from '@/utils/instagram';
import { validateTikTokUrl, validateInstagramUrl, validateYoutubeUrl } from '@/utils/urls';
import { Composer, InputFile } from 'grammy';
import { cluster } from 'radashi';
import { getYoutubeDownloadUrl } from '@/utils/youtube';
import { getDownloadUrl } from '@/utils/yt-dlp';
import { logger } from '@/utils/logger';

const composer = new Composer<Context>();
const feature = composer.chatType('private');

const redis = getRedisInstance();

feature.on('message:text', logHandle('download-message'), async (context) => {
  const url = context.message.text.trim();

  const isTikTok = validateTikTokUrl(url);
  const isInstagram = validateInstagramUrl(url);
  const isYoutube = validateYoutubeUrl(url);

  const isServiceSupported = isTikTok || isInstagram || isYoutube;

  if (!isServiceSupported) {
    return context.reply(context.t('err-invalid-url'));
  }

  const cachedFileId = await redis.get(url);
  if (cachedFileId) {
    return context.replyWithVideo(cachedFileId);
  }

  let imagesUrls: string[] | undefined;
  let videoUrl = await getDownloadUrl(url);

  if (!videoUrl) {
    logger.info(`Failed to get download URL for ${url}, using fallback`);
    try {
      if (isTikTok) {
        const result = await getTiktokDownloadUrl(url);
        imagesUrls = result.images;
        videoUrl = result.play;
      } else if (isInstagram) {
        const result = await getInstagramDownloadUrl(url);
        imagesUrls = result.images;
        videoUrl = result.play;
      } else if (isYoutube) {
        const result = await getYoutubeDownloadUrl(url);
        videoUrl = result.play;
      }
    } catch (err: any) {
      const message = err?.message ?? String(err);
      if (typeof message === 'string' && message.startsWith('err-')) {
        return context.reply(context.t(message));
      }

      return context.reply(context.t('err-generic'));
    }
  }

  if (!videoUrl && !imagesUrls?.length) {
    return context.reply(context.t('err-invalid-download-urls'));
  }

  if (imagesUrls?.length) {
    const chunks = cluster(imagesUrls, 10);
    for (const chunk of chunks) {
      await context.replyWithMediaGroup(
        chunk.map((imageUrl) => ({ media: imageUrl, type: 'photo' })),
      );
    }
  } else {
    const { video } = await context.replyWithVideo(new InputFile({ url: videoUrl }));
    await redis.set(url, video.file_id, 'EX', TTL_URLS);
  }
});

export { composer as download };
