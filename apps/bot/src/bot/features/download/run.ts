import {
  DOWNLOADING_STARTED,
  ERR_INVALID_DOWNLOAD_URLS,
  ERR_INVALID_URL,
} from '@/constants/i18n';
import type { Context } from '../../context';
import { createMessageDeleter, replyDownloadError, withActionIndicator } from './chat';
import { replyCaptionAndCache, replyFromCache, sendMedia } from './media';
import { detectPlatform, type DownloadResult, fetchDownload, hasDownloadableMedia } from './platform';

export interface DownloadOnceOptions {
  replyToMessageId?: number;
  withCaption: boolean;
}

function replyParams(replyToMessageId?: number) {
  return replyToMessageId ? { message_id: replyToMessageId } : undefined;
}

export async function downloadOnce(context: Context, url: string, opts: DownloadOnceOptions) {
  const platform = detectPlatform(url);

  if (!platform) {
    await replyDownloadError(context, new Error(ERR_INVALID_URL), opts.replyToMessageId);

    return;
  }

  if (
    await replyFromCache(context, url, {
      replyToMessageId: opts.replyToMessageId,
      withCaption: opts.withCaption,
    })
  ) {
    return;
  }

  const statusMessage = await context.reply(context.t(DOWNLOADING_STARTED), {
    reply_parameters: replyParams(opts.replyToMessageId),
  });
  const dismissStatus = createMessageDeleter(context, statusMessage.message_id);

  let result: DownloadResult;

  try {
    result = await withActionIndicator(context, () => fetchDownload(url, platform));
  } catch (error: unknown) {
    await dismissStatus();
    await replyDownloadError(context, error, opts.replyToMessageId);

    return;
  }

  if (!hasDownloadableMedia(result)) {
    await dismissStatus();
    await replyDownloadError(context, new Error(ERR_INVALID_DOWNLOAD_URLS), opts.replyToMessageId);

    return;
  }

  const contentMessageId = await sendMedia(context, url, result, {
    replyToMessageId: opts.replyToMessageId,
  });

  if (contentMessageId && contentMessageId !== statusMessage.message_id) {
    await dismissStatus();
  }

  await replyCaptionAndCache(
    context,
    result.caption,
    url,
    contentMessageId,
    opts.withCaption,
  );
}

export async function downloadUrls(
  context: Context,
  urls: string[],
  opts: DownloadOnceOptions,
) {
  for (const url of urls) {
    await downloadOnce(context, url, opts);
  }
}
