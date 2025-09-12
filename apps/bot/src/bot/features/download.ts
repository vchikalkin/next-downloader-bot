/* eslint-disable consistent-return */
import { type Context } from '../context';
import { logHandle } from '../helpers/logging';
import { TTL_URLS } from '@/config/redis';
import { getRedisInstance } from '@/utils/redis';
import { getTiktokDownloadUrl } from '@/utils/tiktok';
import { validateTikTokUrl } from '@/utils/urls';
import { Composer, InputFile } from 'grammy';
import { cluster } from 'radashi';

const composer = new Composer<Context>();
const feature = composer.chatType('private');

const redis = getRedisInstance();

feature.on('message:text', logHandle('download-message'), async (context) => {
  const url = context.message.text.trim();

  if (!validateTikTokUrl(url)) {
    return context.reply(context.t('err-invalid-url'));
  }

  const cachedFileId = await redis.get(url);
  if (cachedFileId) {
    return context.replyWithVideo(cachedFileId);
  }

  const { images: imagesUrls, play: videoUrl } = await getTiktokDownloadUrl(url);

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

    return;
  }

  if (videoUrl) {
    const { video } = await context.replyWithVideo(new InputFile({ url: videoUrl }));
    await redis.set(url, video.file_id, 'EX', TTL_URLS);
  }
});

export { composer as download };
