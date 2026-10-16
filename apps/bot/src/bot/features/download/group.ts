import { Composer } from 'grammy';
import { ERR_INVALID_URL } from '@/constants/i18n';
import type { Context } from '../../context';
import { logHandle } from '../../helpers/logging';
import { replyDownloadError } from './chat';
import { extractDownloadableUrls } from './extract';
import { downloadUrls } from './run';

const composer = new Composer<Context>();
const feature = composer.chatType(['group', 'supergroup']);

function mentionsBot(context: Context): boolean {
  const username = context.me.username.toLowerCase();
  const { message } = context;

  if (!message) {
    return false;
  }

  const text = message.text ?? message.caption ?? '';
  const entities = message.entities ?? message.caption_entities ?? [];

  // ponytail: bots always have @username; text_mention not needed
  for (const entity of entities) {
    if (entity.type !== 'mention') {
      continue;
    }

    const mention = text.slice(entity.offset, entity.offset + entity.length).toLowerCase();

    if (mention === `@${username}`) {
      return true;
    }
  }

  return false;
}

function isBotMentionReply(context: Context): boolean {
  return Boolean(context.message?.reply_to_message) && mentionsBot(context);
}

function messageLinks(context: Context) {
  const { message } = context;

  if (!message) {
    return [];
  }

  return extractDownloadableUrls(
    message.text ?? message.caption,
    message.entities ?? message.caption_entities,
  );
}

function replySourceLinks(context: Context) {
  const source = context.message?.reply_to_message;

  if (!source) {
    return [];
  }

  return extractDownloadableUrls(
    source.text ?? source.caption,
    source.entities ?? source.caption_entities,
  );
}

feature
  .filter(isBotMentionReply)
  .on('message', logHandle('group-download-mention'), async (context) => {
    const source = context.message.reply_to_message;
    const links = replySourceLinks(context);

    if (!source || links.length === 0) {
      await replyDownloadError(context, new Error(ERR_INVALID_URL), {
        messageId: source?.message_id,
      });

      return;
    }

    await downloadUrls(context, links, {
      replyToMessageId: source.message_id,
      withCaption: false,
    });
  });

feature
  .filter((context) => !isBotMentionReply(context))
  .on(['message:text', 'message:caption'], logHandle('group-download-auto'), async (context) => {
    const links = messageLinks(context);

    if (links.length === 0) {
      return;
    }

    await downloadUrls(context, links, {
      replyToMessageId: context.message.message_id,
      withCaption: false,
    });
  });

export { composer as groupDownload };
