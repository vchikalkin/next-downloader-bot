import { Composer } from 'grammy';
import { fmt, link as platformLink } from '@grammyjs/parse-mode';
import { ERR_INVALID_URL, MSG_SENT_BY } from '@/constants/i18n';
import type { Context } from '../../context';
import { logHandle } from '../../helpers/logging';
import { canBotDeleteMessages, replyDownloadError } from './chat';
import { linksFromMessage } from './extract';
import type { AttributionCaption } from './media';
import { detectPlatform, type Platform } from './platform';
import { downloadLink } from './run';

const platformLabel: Record<Platform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
};

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

export function isBotMentionReply(context: Context): boolean {
  return Boolean(context.message?.reply_to_message) && mentionsBot(context);
}

function attributionCaption(
  context: Context,
  username: string | undefined,
  url: string,
): AttributionCaption | undefined {
  if (!username) {
    return undefined;
  }

  const platform = detectPlatform(url);

  if (!platform) {
    return undefined;
  }

  const prefix = context.t(MSG_SENT_BY, { username: `@${username}` });
  const formatted = fmt`${prefix} ${platformLink(url)}${platformLabel[platform]}${platformLink}`;

  return {
    caption: formatted.caption,
    caption_entities: formatted.caption_entities,
  };
}

feature
  .filter(isBotMentionReply)
  .on('message', logHandle('group-download-mention'), async (context) => {
    const source = context.message.reply_to_message;
    const link = source ? linksFromMessage(source)[0] : undefined;

    if (!source || !link) {
      await replyDownloadError(context, new Error(ERR_INVALID_URL), source?.message_id);

      return;
    }

    const canDelete = await canBotDeleteMessages(context);
    const linkAuthor = source.from?.username;

    await downloadLink(context, link, {
      attributionCaption: canDelete ? attributionCaption(context, linkAuthor, link.url) : undefined,
      replaceMessageIds: canDelete
        ? [source.message_id, context.message.message_id]
        : undefined,
      replyToMessageId: source.message_id,
      showStatus: false,
      withCaption: false,
    });
  });

feature
  .filter((context) => !isBotMentionReply(context))
  .on(['message:text', 'message:caption'], logHandle('group-download-auto'), async (context) => {
    const link = linksFromMessage(context.message)[0];

    if (!link) {
      return;
    }

    const canDelete = await canBotDeleteMessages(context);

    await downloadLink(context, link, {
      attributionCaption: canDelete
        ? attributionCaption(context, context.from.username, link.url)
        : undefined,
      replaceMessageIds: canDelete ? [context.message.message_id] : undefined,
      replyToMessageId: context.message.message_id,
      showStatus: false,
      withCaption: false,
    });
  });

export { composer as groupDownload };
