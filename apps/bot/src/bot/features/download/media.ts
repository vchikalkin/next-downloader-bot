import { createHash } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { GrammyError, InputFile } from 'grammy';
import { cluster } from 'radashi';
import { code, expandableBlockquote, fmt } from '@grammyjs/parse-mode';
import type { MessageEntity } from '@grammyjs/types';
import { TTL_URLS } from '@/config/redis';
import { redis } from '@/utils/redis';
import { removeHashtags } from '@/utils/text';
import type { Context } from '../../context';
import { replyParams } from './chat';
import { linkBase } from './extract';
import type { DownloadResult } from './platform';

export interface AttributionCaption {
  caption: string;
  caption_entities?: MessageEntity[];
}

export interface SendMediaOptions {
  attributionCaption?: AttributionCaption;
  replyToMessageId?: number;
}

function mediaCacheKeys(url: string) {
  const id = createHash('sha256').update(linkBase(url)).digest('hex');

  return { caption: `caption:${id}`, video: `video:${id}` };
}

function isStaleFileIdError(error: unknown): boolean {
  return (
    error instanceof GrammyError &&
    error.error_code === 400 &&
    /wrong (?:remote )?file identifi/iu.test(error.description)
  );
}

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

  const { caption: captionKey } = mediaCacheKeys(url);

  await redis.set(captionKey, caption, 'EX', TTL_URLS);

  if (opts.withCaption) {
    await replyFormattedCaption(context, caption, opts.contentMessageId);
  }
}

interface InlineInterface2 { withCaption: boolean }
export async function replyFromCache(
  context: Context,
  url: string,
  opts: SendMediaOptions & InlineInterface2,
): Promise<boolean> {
  const keys = mediaCacheKeys(url);
  const cachedVideoId = await redis.get(keys.video);

  if (!cachedVideoId) {
    return false;
  }

  try {
    const cachedMessage = await context.replyWithVideo(cachedVideoId, {
      ...opts.attributionCaption,
      reply_parameters: replyParams(opts.replyToMessageId),
    });

    if (opts.withCaption) {
      const cachedCaption = await redis.get(keys.caption);

      if (cachedCaption) {
        await replyFormattedCaption(context, cachedCaption, cachedMessage.message_id);
      }
    }

    return true;
  } catch (error) {
    if (!isStaleFileIdError(error)) {
      throw error;
    }

    await redis.del(keys.video, keys.caption);

    return false;
  }
}

export async function sendMedia(
  context: Context,
  url: string,
  result: DownloadResult,
  opts: SendMediaOptions = {},
): Promise<number | undefined> {
  try {
    const imageCaption = result.videoFilePath ? undefined : opts.attributionCaption;
    const afterImages = await sendImages(context, result.imagesUrls ?? [], {
      attributionCaption: imageCaption,
      replyToMessageId: opts.replyToMessageId,
    });

    return await sendVideoAndCache(context, {
      attributionCaption: opts.attributionCaption,
      existingContentMessageId: afterImages,
      replyToMessageId: opts.replyToMessageId,
      url,
      videoFilePath: result.videoFilePath,
    });
  } finally {
    if (result.videoFilePath) {
      await cleanupTempFile(result.videoFilePath);
    }
  }
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
    reply_parameters: replyParams(replyToMessageId),
  });
}

async function sendImages(context: Context, imagesUrls: string[], opts: SendMediaOptions) {
  if (imagesUrls.length === 0) {
    return undefined;
  }

  let contentMessageId: number | undefined;
  const options = { reply_parameters: replyParams(opts.replyToMessageId) };

  for (const [chunkIndex, chunk] of cluster(imagesUrls, 10).entries()) {
    const imageMessages = await context.replyWithMediaGroup(
      chunk.map((imageUrl, index) => {
        return {
          media: imageUrl,
          type: 'photo' as const,
          ...(chunkIndex === 0 && index === 0 && opts.attributionCaption
            ? opts.attributionCaption
            : {}),
        };
      }),
      options,
    );

    contentMessageId = contentMessageId ?? imageMessages.at(0)?.message_id;
  }

  return contentMessageId;
}

interface SendVideoOptions extends SendMediaOptions {
  existingContentMessageId?: number;
  url: string;
  videoFilePath?: string;
}

async function sendVideoAndCache(context: Context, opts: SendVideoOptions) {
  const { attributionCaption, existingContentMessageId, replyToMessageId, url, videoFilePath } =
    opts;

  if (!videoFilePath) {
    return existingContentMessageId;
  }

  const { video, ...videoMessage } = await context.replyWithVideo(new InputFile(videoFilePath), {
    ...attributionCaption,
    reply_parameters: replyParams(replyToMessageId),
  });

  await redis.set(mediaCacheKeys(url).video, video.file_id, 'EX', TTL_URLS);

  return videoMessage.message_id;
}
