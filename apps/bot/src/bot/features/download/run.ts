import * as sentry from '@sentry/node';
import {
  DOWNLOADING_STARTED,
  ERR_INVALID_DOWNLOAD_URLS,
  ERR_INVALID_URL,
} from '@/constants/i18n';
import type { Context } from '../../context';
import {
  createMessageDeleter,
  deleteMessages,
  replyDownloadError,
  replyParams,
  withActionIndicator,
} from './chat';
import type { DownloadableLink } from './extract';
import { type AttributionCaption, replyCaptionAndCache, replyFromCache, sendMedia } from './media';
import {
  detectPlatform,
  fetchDownload,
  hasDownloadableMedia,
  type Platform,
} from './platform';

export interface DownloadLinkOptions {
  attributionCaption?: AttributionCaption;
  /** After successful media send, delete these (link / mention). Implies no reply on media. */
  replaceMessageIds?: number[];
  replyToMessageId?: number;
  showStatus: boolean;
  withCaption: boolean;
}

function chatType(context: Context) {
  return context.chat?.type ?? 'unknown';
}

function trackDownload(
  context: Context,
  platform: Platform,
  outcome: 'cache' | 'error' | 'success',
) {
  sentry.metrics.count('bot.download', 1, {
    attributes: { chat_type: chatType(context), outcome, platform },
  });
}

function trackDownloadDuration(
  context: Context,
  platform: Platform,
  outcome: 'error' | 'success',
  ms: number,
) {
  sentry.metrics.distribution('bot.download.duration', ms, {
    attributes: { chat_type: chatType(context), outcome, platform },
    unit: 'millisecond',
  });
}

export async function downloadLink(
  context: Context,
  link: DownloadableLink,
  opts: DownloadLinkOptions,
) {
  const { url } = link;
  const isReplacing = Boolean(opts.replaceMessageIds?.length);
  const mediaReplyTo = isReplacing ? undefined : opts.replyToMessageId;
  const errorReplyTo = opts.replyToMessageId;
  const platform = detectPlatform(url);

  if (!platform) {
    await replyDownloadError(context, new Error(ERR_INVALID_URL), errorReplyTo);

    return;
  }

  sentry.setTag('platform', platform);

  if (
    await replyFromCache(context, url, {
      attributionCaption: opts.attributionCaption,
      replyToMessageId: mediaReplyTo,
      withCaption: opts.withCaption,
    })
  ) {
    trackDownload(context, platform, 'cache');
    await deleteMessages(context, opts.replaceMessageIds ?? []);

    return;
  }

  let dismissStatus: (() => Promise<void>) | undefined;

  if (opts.showStatus) {
    const statusMessage = await context.reply(context.t(DOWNLOADING_STARTED), {
      reply_parameters: replyParams(errorReplyTo),
    });

    dismissStatus = createMessageDeleter(context, statusMessage.message_id);
  }

  let result;
  const fetchStarted = performance.now();

  try {
    result = opts.showStatus
      ? await withActionIndicator(context, () => fetchDownload(url, platform))
      : await fetchDownload(url, platform);
  } catch (error: unknown) {
    trackDownloadDuration(context, platform, 'error', performance.now() - fetchStarted);
    await dismissStatus?.();
    trackDownload(context, platform, 'error');
    await replyDownloadError(context, error, errorReplyTo);

    return;
  }

  const fetchMs = performance.now() - fetchStarted;

  if (!hasDownloadableMedia(result)) {
    trackDownloadDuration(context, platform, 'error', fetchMs);
    await dismissStatus?.();
    trackDownload(context, platform, 'error');
    await replyDownloadError(context, new Error(ERR_INVALID_DOWNLOAD_URLS), errorReplyTo);

    return;
  }

  trackDownloadDuration(context, platform, 'success', fetchMs);

  try {
    const contentMessageId = await sendMedia(context, url, result, {
      attributionCaption: opts.attributionCaption,
      replyToMessageId: mediaReplyTo,
    });

    await replyCaptionAndCache(context, result.caption, url, {
      contentMessageId,
      withCaption: opts.withCaption,
    });
    await deleteMessages(context, opts.replaceMessageIds ?? []);
    trackDownload(context, platform, 'success');
  } catch (error: unknown) {
    trackDownload(context, platform, 'error');
    throw error;
  } finally {
    await dismissStatus?.();
  }
}
