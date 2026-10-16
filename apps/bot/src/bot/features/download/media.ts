import { rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { InputFile } from 'grammy';
import { cluster } from 'radashi';
import { code, expandableBlockquote, fmt } from '@grammyjs/parse-mode';
import { TTL_URLS } from '@/config/redis';
import { getRedisInstance } from '@/utils/redis';
import { removeHashtags } from '@/utils/text';
import type { Context } from '../../context';
import { replyParams,type ReplyTarget } from './chat';
import type { DownloadResult } from './platform';

const redis = getRedisInstance();

interface MediaReplyOptions {
  replyTarget?: ReplyTarget;
}

interface CacheReplyOptions extends MediaReplyOptions {
  withCaption: boolean;
}

export async function replyCaptionAndCache(
  context: Context,
  caption: string | undefined,
  url: string,
  contentMessageId?: number,
  sendCaption = true,
) {
  if (!caption) {
    return;
  }

  await redis.set(`caption:${url}`, caption, 'EX', TTL_URLS);

  if (sendCaption) {
    await replyFormattedCaption(context, caption, contentMessageId);
  }
}

export async function replyFromCache(
  context: Context,
  url: string,
  opts: CacheReplyOptions,
): Promise<boolean> {
  const cachedVideoId = await redis.get(url);

  if (!cachedVideoId) {
    return false;
  }

  const cachedMessage = await context.replyWithVideo(cachedVideoId, {
    reply_parameters: replyParams(opts.replyTarget),
  });

  if (opts.withCaption) {
    const cachedCaption = await redis.get(`caption:${url}`);

    if (cachedCaption) {
      await replyFormattedCaption(context, cachedCaption, cachedMessage.message_id);
    }
  }

  return true;
}

export async function sendMedia(
  context: Context,
  url: string,
  result: DownloadResult,
  opts: MediaReplyOptions = {},
): Promise<number | undefined> {
  const afterImages = await sendImages(context, result.imagesUrls ?? [], {
    existingContentMessageId: undefined,
    replyTarget: opts.replyTarget,
  });

  return sendVideoAndCache(context, {
    existingContentMessageId: afterImages,
    replyTarget: opts.replyTarget,
    url,
    videoFilePath: result.videoFilePath,
    videoUrl: result.videoUrl,
  });
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

async function replyFormattedCaption(context: Context, caption: string, replyToMessageId?: number) {
  const { entities, text } = formatCaption(caption);

  if (!text.trim()) {
    return;
  }

  await context.reply(text, {
    entities,
    reply_parameters: replyParams(
      replyToMessageId ? { messageId: replyToMessageId } : undefined,
    ),
  });
}

interface SendImagesOptions extends MediaReplyOptions {
  existingContentMessageId?: number;
}

async function sendImages(context: Context, imagesUrls: string[], opts: SendImagesOptions) {
  if (imagesUrls.length === 0) {
    return opts.existingContentMessageId;
  }

  let contentMessageId = opts.existingContentMessageId;
  const options = { reply_parameters: replyParams(opts.replyTarget) };

  for (const chunk of cluster(imagesUrls, 10)) {
    const imageMessages = await context.replyWithMediaGroup(
      chunk.map((imageUrl) => ({ media: imageUrl, type: 'photo' as const })),
      options,
    );

    contentMessageId = contentMessageId ?? imageMessages.at(0)?.message_id;
  }

  return contentMessageId;
}

interface SendVideoOptions extends MediaReplyOptions {
  existingContentMessageId?: number;
  url: string;
  videoFilePath?: string;
  videoUrl?: string;
}

async function sendVideoAndCache(context: Context, opts: SendVideoOptions) {
  const { existingContentMessageId, replyTarget, url, videoFilePath, videoUrl } = opts;

  if (!videoUrl && !videoFilePath) {
    return existingContentMessageId;
  }

  try {
    const source = videoFilePath
      ? new InputFile(videoFilePath)
      : new InputFile({ url: videoUrl as string });
    const { video, ...videoMessage } = await context.replyWithVideo(source, {
      reply_parameters: replyParams(replyTarget),
    });

    await redis.set(url, video.file_id, 'EX', TTL_URLS);

    return videoMessage.message_id;
  } finally {
    if (videoFilePath) {
      await cleanupTempFile(videoFilePath);
    }
  }
}
