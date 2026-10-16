import {
  DOWNLOADING_STARTED,
  ERR_INVALID_DOWNLOAD_URLS,
  ERR_INVALID_URL,
} from '@/constants/i18n';
import type { Context } from '../../context';
import {
  createMessageDeleter,
  replyDownloadError,
  replyParams,
  type ReplyTarget,
  withActionIndicator,
} from './chat';
import type { DownloadableLink } from './extract';
import { replyCaptionAndCache, replyFromCache, sendMedia } from './media';
import { detectPlatform, type DownloadResult, fetchDownload, hasDownloadableMedia } from './platform';

export interface DownloadOnceOptions {
  replyToMessageId?: number;
  withCaption: boolean;
}

function replyTarget(link: DownloadableLink, replyToMessageId?: number): ReplyTarget | undefined {
  if (!replyToMessageId) {
    return undefined;
  }

  return {
    messageId: replyToMessageId,
    quote: link.quote,
    quotePosition: link.quotePosition,
  };
}

export async function downloadOnce(
  context: Context,
  link: DownloadableLink,
  opts: DownloadOnceOptions,
) {
  const { url } = link;
  const target = replyTarget(link, opts.replyToMessageId);
  const platform = detectPlatform(url);

  if (!platform) {
    await replyDownloadError(context, new Error(ERR_INVALID_URL), target);

    return;
  }

  if (
    await replyFromCache(context, url, {
      replyTarget: target,
      withCaption: opts.withCaption,
    })
  ) {
    return;
  }

  const statusMessage = await context.reply(context.t(DOWNLOADING_STARTED), {
    reply_parameters: replyParams(target),
  });
  const dismissStatus = createMessageDeleter(context, statusMessage.message_id);

  let result: DownloadResult;

  try {
    result = await withActionIndicator(context, () => fetchDownload(url, platform));
  } catch (error: unknown) {
    await dismissStatus();
    await replyDownloadError(context, error, target);

    return;
  }

  if (!hasDownloadableMedia(result)) {
    await dismissStatus();
    await replyDownloadError(context, new Error(ERR_INVALID_DOWNLOAD_URLS), target);

    return;
  }

  const contentMessageId = await sendMedia(context, url, result, {
    replyTarget: target,
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
  links: DownloadableLink[],
  opts: DownloadOnceOptions,
) {
  for (const link of links) {
    await downloadOnce(context, link, opts);
  }
}
