import { Composer } from 'grammy';
import {
  DOWNLOADING_STARTED,
  ERR_INVALID_DOWNLOAD_URLS,
  ERR_INVALID_URL,
} from '@/constants/i18n';
import type { Context } from '../../context';
import { logHandle } from '../../helpers/logging';
import { createMessageDeleter, replyDownloadError, withActionIndicator } from './chat';
import { replyCaptionAndCache, replyFromCache, sendMedia } from './media';
import {
  detectPlatform,
  type DownloadResult,
  fetchDownload,
  hasDownloadableMedia,
} from './platform';

const composer = new Composer<Context>();
const feature = composer.chatType('private');

feature.on('message:text', logHandle('download-message'), async (context) => {
  const url = context.message.text.trim();
  const platform = detectPlatform(url);

  if (!platform) {
    await context.reply(context.t(ERR_INVALID_URL));

    return;
  }

  if (await replyFromCache(context, url)) {
    return;
  }

  const statusMessage = await context.reply(context.t(DOWNLOADING_STARTED));
  const dismissStatus = createMessageDeleter(context, statusMessage.message_id);

  let result: DownloadResult;

  try {
    result = await withActionIndicator(context, () => fetchDownload(url, platform));
  } catch (error: unknown) {
    await dismissStatus();
    await replyDownloadError(context, error);

    return;
  }

  if (!hasDownloadableMedia(result)) {
    await dismissStatus();
    await context.reply(context.t(ERR_INVALID_DOWNLOAD_URLS));

    return;
  }

  const contentMessageId = await sendMedia(context, url, result);

  if (contentMessageId && contentMessageId !== statusMessage.message_id) {
    await dismissStatus();
  }

  await replyCaptionAndCache(context, result.caption, url, contentMessageId);
});

export { composer as download };
