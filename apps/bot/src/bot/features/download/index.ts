import { Composer } from 'grammy';
import type { Context } from '../../context';
import { logHandle } from '../../helpers/logging';
import { linksFromMessage } from './extract';
import { groupDownload } from './group';
import { downloadUrls } from './run';

const composer = new Composer<Context>();

const privateFeature = composer.chatType('private');

privateFeature.on(
  ['message:text', 'message:caption'],
  logHandle('download-message'),
  async (context, next) => {
    const { message } = context;
    const links = linksFromMessage(message);

    // ponytail: fall through to unhandled/welcome; ERR_INVALID_URL only for bad downloadable URLs
    if (links.length === 0) {
      return next();
    }

    await downloadUrls(context, links, {
      replyToMessageId: message.message_id,
      showStatus: true,
      withCaption: true,
    });
  },
);

composer.use(groupDownload);

export { composer as download };
