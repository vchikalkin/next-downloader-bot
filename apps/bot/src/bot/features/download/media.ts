import { type Context } from '../../context';
import { type DownloadResult } from './platform';
import { TTL_URLS } from '@/config/redis';
import { getRedisInstance } from '@/utils/redis';
import { removeHashtags } from '@/utils/text';
import { code, expandableBlockquote, fmt } from '@grammyjs/parse-mode';
import { InputFile } from 'grammy';
import { rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { cluster } from 'radashi';

const redis = getRedisInstance();

export async function replyCaptionAndCache(
  context: Context,
  caption: string | undefined,
  url: string,
  contentMessageId?: number,
) {
  if (!caption) return;

  await redis.set(`caption:${url}`, caption, 'EX', TTL_URLS);
  await replyFormattedCaption(context, caption, contentMessageId);
}

export async function replyFromCache(context: Context, url: string): Promise<boolean> {
  const cachedVideoId = await redis.get(url);
  if (!cachedVideoId) return false;

  const cachedMessage = await context.replyWithVideo(cachedVideoId);
  const cachedCaption = await redis.get(`caption:${url}`);

  if (cachedCaption) {
    await replyFormattedCaption(context, cachedCaption, cachedMessage.message_id);
  }

  return true;
}

export async function sendMedia(
  context: Context,
  url: string,
  result: DownloadResult,
): Promise<number | undefined> {
  const afterImages = await sendImages(context, result.imagesUrls ?? []);

  return sendVideoAndCache(context, {
    existingContentMessageId: afterImages,
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
  if (!text.trim().length) return;

  await context.reply(text, {
    entities,
    reply_parameters: replyToMessageId ? { message_id: replyToMessageId } : undefined,
  });
}

async function sendImages(
  context: Context,
  imagesUrls: string[],
  existingContentMessageId?: number,
) {
  if (!imagesUrls.length) return existingContentMessageId;

  let contentMessageId = existingContentMessageId;

  for (const chunk of cluster(imagesUrls, 10)) {
    const imageMessages = await context.replyWithMediaGroup(
      chunk.map((imageUrl) => ({ media: imageUrl, type: 'photo' as const })),
    );
    contentMessageId ??= imageMessages.at(0)?.message_id;
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
  if (!videoUrl && !videoFilePath) return existingContentMessageId;

  try {
    const source = videoFilePath
      ? new InputFile(videoFilePath)
      : new InputFile({ url: videoUrl as string });
    const { video, ...videoMessage } = await context.replyWithVideo(source);

    await redis.set(url, video.file_id, 'EX', TTL_URLS);
    return videoMessage.message_id;
  } finally {
    if (videoFilePath) {
      await cleanupTempFile(videoFilePath);
    }
  }
}
