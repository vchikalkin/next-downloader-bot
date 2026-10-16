import {
  DOWNLOADING_STARTED,
  ERR_INVALID_DOWNLOAD_URLS,
  ERR_INVALID_URL,
  MSG_DOWNLOAD_LINKS_CAPPED,
} from '@/constants/i18n';
import { MAX_DOWNLOAD_LINKS } from '@/constants/limits';
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
  showStatus: boolean;
  withCaption: boolean;
}

function toReplyTarget(link: DownloadableLink, replyToMessageId?: number): ReplyTarget | undefined {
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
  const target = toReplyTarget(link, opts.replyToMessageId);
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

  let dismissStatus: (() => Promise<void>) | undefined;
  let statusMessageId: number | undefined;

  if (opts.showStatus) {
    const statusMessage = await context.reply(context.t(DOWNLOADING_STARTED), {
      reply_parameters: replyParams(target),
    });

    statusMessageId = statusMessage.message_id;
    dismissStatus = createMessageDeleter(context, statusMessage.message_id);
  }

  let result: DownloadResult;

  try {
    result = opts.showStatus
      ? await withActionIndicator(context, () => fetchDownload(url, platform))
      : await fetchDownload(url, platform);
  } catch (error: unknown) {
    await dismissStatus?.();
    await replyDownloadError(context, error, target);

    return;
  }

  if (!hasDownloadableMedia(result)) {
    await dismissStatus?.();
    await replyDownloadError(context, new Error(ERR_INVALID_DOWNLOAD_URLS), target);

    return;
  }

  const contentMessageId = await sendMedia(context, url, result, target);

  if (statusMessageId && contentMessageId && contentMessageId !== statusMessageId) {
    await dismissStatus?.();
  }

  await replyCaptionAndCache(context, result.caption, url, {
    contentMessageId,
    withCaption: opts.withCaption,
  });
}

export async function downloadUrls(
  context: Context,
  links: DownloadableLink[],
  opts: DownloadOnceOptions,
) {
  for (const link of links.slice(0, MAX_DOWNLOAD_LINKS)) {
    await downloadOnce(context, link, opts);
  }

  if (links.length <= MAX_DOWNLOAD_LINKS) {
    return;
  }

  await context.reply(context.t(MSG_DOWNLOAD_LINKS_CAPPED, { count: MAX_DOWNLOAD_LINKS }), {
    reply_parameters: replyParams(
      opts.replyToMessageId ? { messageId: opts.replyToMessageId } : undefined,
    ),
  });
}
