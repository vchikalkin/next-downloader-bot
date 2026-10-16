import { rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { InputFile } from 'grammy';
import { cluster } from 'radashi';
import { code, expandableBlockquote, fmt } from '@grammyjs/parse-mode';
import { TTL_URLS } from '@/config/redis';
import { getRedisInstance } from '@/utils/redis';
import { removeHashtags } from '@/utils/text';
import type { Context } from '../../context';
import { replyParams, type ReplyTarget } from './chat';
import type { DownloadResult } from './platform';

const redis = getRedisInstance();

interface InlineInterface { contentMessageId?: number; withCaption: boolean }
export async function replyCaptionAndCache(
  context: Context,
  caption: string | undefined,
  url: string,
  opts: InlineInterface,
) {
  if (!caption) {
    return;
  }

  await redis.set(`caption:${url}`, caption, 'EX', TTL_URLS);

  if (opts.withCaption) {
    await replyFormattedCaption(context, caption, opts.contentMessageId);
  }
}

interface InlineInterface2 { replyTarget?: ReplyTarget; withCaption: boolean }
export async function replyFromCache(
  context: Context,
  url: string,
  opts: InlineInterface2,
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
  replyTarget?: ReplyTarget,
): Promise<number | undefined> {
  const afterImages = await sendImages(context, result.imagesUrls ?? [], replyTarget);

  return sendVideoAndCache(context, {
    existingContentMessageId: afterImages,
    replyTarget,
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
    reply_parameters: replyParams(replyToMessageId ? { messageId: replyToMessageId } : undefined),
  });
}

async function sendImages(context: Context, imagesUrls: string[], replyTarget?: ReplyTarget) {
  if (imagesUrls.length === 0) {
    return undefined;
  }

  let contentMessageId: number | undefined;
  const options = { reply_parameters: replyParams(replyTarget) };

  for (const chunk of cluster(imagesUrls, 10)) {
    const imageMessages = await context.replyWithMediaGroup(
      chunk.map((imageUrl) => ({ media: imageUrl, type: 'photo' as const })),
      options,
    );

    contentMessageId = contentMessageId ?? imageMessages.at(0)?.message_id;
  }

  return contentMessageId;
}

interface SendVideoOptions {
  existingContentMessageId?: number;
  replyTarget?: ReplyTarget;
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
