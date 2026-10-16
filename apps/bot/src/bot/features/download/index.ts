import { Composer } from 'grammy';
import { ERR_INVALID_URL } from '@/constants/i18n';
import type { Context } from '../../context';
import { logHandle } from '../../helpers/logging';
import { replyDownloadError } from './chat';
import { extractDownloadableUrls } from './extract';
import { groupDownload } from './group';
import { downloadUrls } from './run';

const composer = new Composer<Context>();

const privateFeature = composer.chatType('private');

privateFeature.on(
  ['message:text', 'message:caption'],
  logHandle('download-message'),
  async (context) => {
    const { message } = context;
    const urls = extractDownloadableUrls(
      message.text ?? message.caption,
      message.entities ?? message.caption_entities,
    );

    if (urls.length === 0) {
      await replyDownloadError(context, new Error(ERR_INVALID_URL));

      return;
    }

    await downloadUrls(context, urls, { withCaption: true });
  },
);

composer.use(groupDownload);

export { composer as download };
