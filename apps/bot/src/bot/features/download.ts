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
import { code, expandableBlockquote, fmt } from '@grammyjs/parse-mode';
import { Composer, InputFile } from 'grammy';
import { cluster } from 'radashi';

const composer = new Composer<Context>();
const feature = composer.chatType('private');
const redis = getRedisInstance();

async function checkCacheAndReply(context: Context, url: string) {
  let contentMessageId: number | undefined;

  const cachedVideoId = await redis.get(url);
  if (cachedVideoId) {
    const cachedMessage = await context.replyWithVideo(cachedVideoId);
    contentMessageId = cachedMessage.message_id;
  }

  if (contentMessageId) {
    const cachedCaption = await redis.get(`caption:${url}`);
    if (cachedCaption) {
      const { entities, text } = formatCaption(cachedCaption);

      if (text.trim().length)
        await context.reply(text, {
          entities,
          reply_parameters: contentMessageId ? { message_id: contentMessageId } : undefined,
        });
      return { captionSent: true, contentMessageId };
    }
  }

  return { contentMessageId };
}

function formatCaption(caption: string) {
  const cleanCaption = removeHashtags(caption);
  return fmt`${expandableBlockquote} ${code} ${cleanCaption} ${code} ${expandableBlockquote}`;
}

async function sendCaptionAndCache(
  context: Context,
  caption: string | undefined,
  url: string,
  contentMessageId?: number,
) {
  if (!caption) return;

  const { entities, text } = formatCaption(caption);
  await redis.set(`caption:${url}`, caption, 'EX', TTL_URLS);

  if (text.trim().length)
    await context.reply(text, {
      entities,
      reply_parameters: contentMessageId ? { message_id: contentMessageId } : undefined,
    });
}

async function sendImages(
  context: Context,
  imagesUrls: string[],
  existingContentMessageId?: number,
) {
  if (!imagesUrls?.length) return existingContentMessageId;

  const chunks = cluster(imagesUrls, 10);
  let contentMessageId = existingContentMessageId;

  for (const chunk of chunks) {
    const imageMessages = await context.replyWithMediaGroup(
      chunk.map((imageUrl) => ({ media: imageUrl, type: 'photo' })),
    );

    if (!contentMessageId && imageMessages.length) {
      contentMessageId = imageMessages.at(0)?.message_id;
    }
  }

  return contentMessageId;
}

async function sendVideoAndCache(
  context: Context,
  videoUrl: string | undefined,
  url: string,
  existingContentMessageId?: number,
) {
  let contentMessageId = existingContentMessageId;

  if (videoUrl && !contentMessageId) {
    const { video, ...videoMessage } = await context.replyWithVideo(
      new InputFile({ url: videoUrl }),
    );
    contentMessageId = videoMessage.message_id;

    await redis.set(url, video.file_id, 'EX', TTL_URLS);
  }

  return contentMessageId;
}

feature.on('message:text', logHandle('download-message'), async (context) => {
  const url = context.message.text.trim();

  const isTikTok = validateTikTokUrl(url);
  const isInstagram = validateInstagramUrl(url);
  const isYoutube = validateYoutubeUrl(url);

  const isSupportedService = isTikTok || isInstagram || isYoutube;

  if (!isSupportedService) {
    return context.reply(context.t('err-invalid-url'));
  }

  const cacheResult = await checkCacheAndReply(context, url);
  if (cacheResult.captionSent) return;
  let contentMessageId = cacheResult.contentMessageId;

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

  contentMessageId = await sendImages(context, imagesUrls ?? [], contentMessageId);

  contentMessageId = await sendVideoAndCache(context, videoUrl, url, contentMessageId);

  await sendCaptionAndCache(context, caption, url, contentMessageId);
});

export { composer as download };
