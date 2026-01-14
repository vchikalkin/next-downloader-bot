/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable consistent-return */
import { type Context } from '../context';
import { logHandle } from '../helpers/logging';
import { TTL_URLS } from '@/config/redis';
import { getInstagramDownloadUrl } from '@/utils/instagram';
import { getRedisInstance } from '@/utils/redis';
import { removeHashtags } from '@/utils/text';
import { getTiktokDownloadUrl } from '@/utils/tiktok';
import { validateInstagramUrl, validateTikTokUrl, validateYoutubeUrl } from '@/utils/urls';
import { getYoutubeDownloadUrl } from '@/utils/youtube';
import { expandableBlockquote, fmt } from '@grammyjs/parse-mode';
import { Composer, InputFile } from 'grammy';
import { cluster } from 'radashi';

const composer = new Composer<Context>();
const feature = composer.chatType('private');
const redis = getRedisInstance();

// Форматирование подписи как expandable blockquote
function formatCaption(caption: string) {
  const cleanCaption = removeHashtags(caption);
  return fmt`${expandableBlockquote} ${cleanCaption} ${expandableBlockquote}`;
}

feature.on('message:text', logHandle('download-message'), async (context) => {
  const url = context.message.text.trim();

  // Проверка поддерживаемых сервисов
  const isTikTok = validateTikTokUrl(url);
  const isInstagram = validateInstagramUrl(url);
  const isYoutube = validateYoutubeUrl(url);

  const isSupportedService = isTikTok || isInstagram || isYoutube;

  if (!isSupportedService) {
    return context.reply(context.t('err-invalid-url'));
  }

  let contentMessageId: number | undefined;

  // Проверка кеша
  const cachedVideoId = await redis.get(url);
  if (cachedVideoId) {
    const cachedMessage = await context.replyWithVideo(cachedVideoId);
    contentMessageId = cachedMessage.message_id;
  }

  if (contentMessageId) {
    const cachedCaption = await redis.get(`caption:${url}`);
    if (cachedCaption) {
      const { entities, text } = formatCaption(cachedCaption);
      return context.reply(text, {
        entities,
        reply_parameters: contentMessageId ? { message_id: contentMessageId } : undefined,
      });
    }
  }

  // Загрузка данных с сервисов
  let imagesUrls: string[] | undefined;
  let videoUrl: string | undefined;
  let caption: string | undefined;

  try {
    if (isTikTok) {
      const result = await getTiktokDownloadUrl(url);
      imagesUrls = result.images;
      videoUrl = result.play;
      caption = result.title;
    } else if (isInstagram) {
      const result = await getInstagramDownloadUrl(url);
      imagesUrls = result.images;
      videoUrl = result.play;
      caption = result.caption;
    } else if (isYoutube) {
      const result = await getYoutubeDownloadUrl(url);
      videoUrl = result.play;
    }
  } catch (error: unknown) {
    const message = (error as Error)?.message ?? String(error);
    if (typeof message === 'string' && message.startsWith('err-')) {
      return context.reply(context.t(message));
    }

    return context.reply(context.t('err-generic'));
  }

  if (!videoUrl && !imagesUrls?.length) {
    return context.reply(context.t('err-invalid-download-urls'));
  }

  // Отправка изображений
  if (imagesUrls?.length) {
    const chunks = cluster(imagesUrls, 10);
    for (const chunk of chunks) {
      const imageMessages = await context.replyWithMediaGroup(
        chunk.map((imageUrl) => ({ media: imageUrl, type: 'photo' })),
      );

      if (!contentMessageId && imageMessages.length) {
        contentMessageId = imageMessages.at(0)?.message_id;
      }
    }
  }

  // Отправка видео
  if (videoUrl && !contentMessageId) {
    const { video, ...videoMessage } = await context.replyWithVideo(
      new InputFile({ url: videoUrl }),
    );
    contentMessageId = videoMessage.message_id;

    await redis.set(url, video.file_id, 'EX', TTL_URLS);
  }

  // Отправка описания
  if (caption) {
    const { entities, text } = formatCaption(caption);
    await redis.set(`caption:${url}`, caption, 'EX', TTL_URLS);

    await context.reply(text, {
      entities,
      reply_parameters: contentMessageId ? { message_id: contentMessageId } : undefined,
    });
  }
});

export { composer as download };
