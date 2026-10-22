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
import { replyCaptionAndCache, replyFromCache, sendMedia } from './media';
import { detectPlatform, fetchDownload, hasDownloadableMedia } from './platform';

export interface DownloadLinkOptions {
  attributionCaption?: string;
  /** After successful media send, delete these (link / mention). Implies no reply on media. */
  replaceMessageIds?: number[];
  replyToMessageId?: number;
  showStatus: boolean;
  withCaption: boolean;
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

  if (
    await replyFromCache(context, url, {
      attributionCaption: opts.attributionCaption,
      replyToMessageId: mediaReplyTo,
      withCaption: opts.withCaption,
    })
  ) {
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

  try {
    result = opts.showStatus
      ? await withActionIndicator(context, () => fetchDownload(url, platform))
      : await fetchDownload(url, platform);
  } catch (error: unknown) {
    await dismissStatus?.();
    await replyDownloadError(context, error, errorReplyTo);

    return;
  }

  if (!hasDownloadableMedia(result)) {
    await dismissStatus?.();
    await replyDownloadError(context, new Error(ERR_INVALID_DOWNLOAD_URLS), errorReplyTo);

    return;
  }

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
  } finally {
    await dismissStatus?.();
  }
}
