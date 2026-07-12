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
import { rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { cluster } from 'radashi';

const composer = new Composer<Context>();
const feature = composer.chatType('private');
const redis = getRedisInstance();

type DownloadResult = {
  caption?: string;
  imagesUrls?: string[];
  videoFilePath?: string;
  videoUrl?: string;
};

async function checkCacheAndReply(context: Context, url: string) {
  const cachedVideoId = await redis.get(url);
  if (!cachedVideoId) {
    return { hit: false as const };
  }

  const cachedMessage = await context.replyWithVideo(cachedVideoId);
  const contentMessageId = cachedMessage.message_id;

  const cachedCaption = await redis.get(`caption:${url}`);
  if (cachedCaption) {
    const { entities, text } = formatCaption(cachedCaption);

    if (text.trim().length) {
      await context.reply(text, {
        entities,
        reply_parameters: { message_id: contentMessageId },
      });
    }
  }

  return { contentMessageId, hit: true as const };
}

async function cleanupTempFile(filePath: string) {
  try {
    await rm(dirname(filePath), { force: true, recursive: true });
  } catch {
    // Ignore cleanup errors
  }
}

function formatCaption(caption: string) {
  const cleanCaption = removeHashtags(caption);
  return fmt`${expandableBlockquote} ${code} ${cleanCaption} ${code} ${expandableBlockquote}`;
}

async function getDownloadData(
  url: string,
  opts: {
    isInstagram: boolean;
    isTikTok: boolean;
    isYoutube: boolean;
  },
): Promise<DownloadResult> {
  const { isInstagram, isTikTok, isYoutube } = opts;

  if (isTikTok) {
    const result = await getTiktokDownloadUrl(url);
    return {
      caption: result.title,
      imagesUrls: result.images,
      videoUrl: result.play,
    };
  }

  if (isInstagram) {
    const result = await getInstagramDownloadUrl(url.replaceAll(/\/reels?\//gu, '/p/'));
    return {
      caption: result.caption,
      imagesUrls: result.images,
      videoUrl: result.play,
    };
  }

  if (isYoutube) {
    const result = await getYoutubeDownloadUrl(url);
    return {
      videoFilePath: result.filePath,
    };
  }

  return {};
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

  if (text.trim().length) {
    await context.reply(text, {
      entities,
      reply_parameters: contentMessageId ? { message_id: contentMessageId } : undefined,
    });
  }
}

async function sendImages(
  context: Context,
  imagesUrls: string[],
  existingContentMessageId?: number,
) {
  if (!imagesUrls.length) return existingContentMessageId;

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
  opts: {
    existingContentMessageId?: number;
    url: string;
    videoFilePath?: string;
    videoUrl?: string;
  },
) {
  const { existingContentMessageId, url, videoFilePath, videoUrl } = opts;
  let contentMessageId = existingContentMessageId;

  if (!videoUrl && !videoFilePath) return contentMessageId;

  try {
    const source = videoFilePath
      ? new InputFile(videoFilePath)
      : new InputFile({ url: videoUrl as string });
    const { video, ...videoMessage } = await context.replyWithVideo(source);

    contentMessageId = videoMessage.message_id;
    await redis.set(url, video.file_id, 'EX', TTL_URLS);
  } finally {
    if (videoFilePath) {
      await cleanupTempFile(videoFilePath);
    }
  }

  return contentMessageId;
}

async function withTypingIndicator<T>(context: Context, fn: () => Promise<T>): Promise<T> {
  const typingInterval = setInterval(async () => {
    try {
      if (context.chatId) {
        await context.api.sendChatAction(context.chatId, 'typing');
      }
    } catch {
      // Ignore errors when sending typing action
    }
  }, 3_000);

  try {
    return await fn();
  } finally {
    clearInterval(typingInterval);
  }
}

feature.on('message:text', logHandle('download-message'), async (context) => {
  const url = context.message.text.trim();

  const isTikTok = validateTikTokUrl(url);
  const isInstagram = validateInstagramUrl(url);
  const isYoutube = validateYoutubeUrl(url);

  if (!isTikTok && !isInstagram && !isYoutube) {
    return context.reply(context.t('err-invalid-url'));
  }

  const cacheResult = await checkCacheAndReply(context, url);
  if (cacheResult.hit) return;

  // Send initial message that link is accepted
  const statusMessage = await context.reply(context.t('downloading-started'));
  const statusMessageId = statusMessage.message_id;

  const deleteStatusMessage = async () => {
    try {
      if (context.chatId) {
        await context.api.deleteMessage(context.chatId, statusMessageId);
      }
    } catch {
      // Ignore if we can't delete
    }
  };

  let contentMessageId: number | undefined;

  let imagesUrls: string[] | undefined;
  let videoUrl: string | undefined;
  let videoFilePath: string | undefined;
  let caption: string | undefined;

  try {
    const result = await withTypingIndicator(context, () =>
      getDownloadData(url, {
        isInstagram,
        isTikTok,
        isYoutube,
      }),
    );

    imagesUrls = result.imagesUrls;
    videoUrl = result.videoUrl;
    videoFilePath = result.videoFilePath;
    caption = result.caption;
  } catch (error: unknown) {
    await deleteStatusMessage();
    const message = (error as Error)?.message ?? String(error);
    if (typeof message === 'string' && message.startsWith('err-')) {
      return context.reply(context.t(message));
    }

    return context.reply(context.t('err-generic'));
  }

  if (!videoUrl && !videoFilePath && !imagesUrls?.length) {
    await deleteStatusMessage();
    return context.reply(context.t('err-invalid-download-urls'));
  }

  contentMessageId = await sendImages(context, imagesUrls ?? [], contentMessageId);
  contentMessageId = await sendVideoAndCache(context, {
    existingContentMessageId: contentMessageId,
    url,
    videoFilePath,
    videoUrl,
  });

  // Delete status message after video is sent
  if (contentMessageId && contentMessageId !== statusMessageId) {
    await deleteStatusMessage();
  }

  await sendCaptionAndCache(context, caption, url, contentMessageId);
});

export { composer as download };
