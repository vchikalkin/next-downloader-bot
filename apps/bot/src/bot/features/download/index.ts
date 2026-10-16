import { Composer } from 'grammy';
import type { Context } from '../../context';
import { logHandle } from '../../helpers/logging';
import { groupDownload } from './group';
import { downloadOnce } from './run';

const composer = new Composer<Context>();

const privateFeature = composer.chatType('private');

privateFeature.on('message:text', logHandle('download-message'), async (context) => {
  await downloadOnce(context, context.message.text.trim(), { withCaption: true });
});

composer.use(groupDownload);

export { composer as download };
