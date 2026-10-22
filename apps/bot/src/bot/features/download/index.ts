import { Composer } from 'grammy';
import type { Context } from '../../context';
import { logHandle } from '../../helpers/logging';
import { linksFromMessage } from './extract';
import { groupDownload } from './group';
import { downloadLink } from './run';

const composer = new Composer<Context>();

const privateFeature = composer.chatType('private');

privateFeature.on(
  ['message:text', 'message:caption'],
  logHandle('download-message'),
  async (context, next) => {
    const { message } = context;
    const link = linksFromMessage(message)[0];

    // ponytail: fall through to unhandled/welcome; ERR_INVALID_URL only for bad downloadable URLs
    if (!link) {
      return next();
    }

    await downloadLink(context, link, {
      replyToMessageId: message.message_id,
      showStatus: true,
      withCaption: true,
    });
  },
);

composer.use(groupDownload);

export { composer as download };
