import * as sentry from '@sentry/node';
import { ERR_GENERIC } from '@/constants/i18n';
import type { Context } from '../../context';

export function replyParams(messageId?: number) {
  if (!messageId) {
    return undefined;
  }

  return { message_id: messageId };
}

export function createMessageDeleter(context: Context, messageId: number) {
  return async () => {
    await deleteMessages(context, [messageId]);
  };
}

export async function deleteMessages(context: Context, messageIds: number[]) {
  if (!context.chatId || messageIds.length === 0) {
    return;
  }

  for (const messageId of messageIds) {
    try {
      await context.api.deleteMessage(context.chatId, messageId);
    } catch {
      // Ignore if we can't delete
    }
  }
}

export async function canBotDeleteMessages(context: Context): Promise<boolean> {
  if (!context.chatId) {
    return false;
  }

  try {
    const me = await context.api.getChatMember(context.chatId, context.me.id);

    return me.status === 'creator' || (me.status === 'administrator' && me.can_delete_messages);
  } catch {
    return false;
  }
}

export async function replyDownloadError(
  context: Context,
  error: unknown,
  replyToMessageId?: number,
) {
  const message = error instanceof Error ? error.message : String(error);
  const options = { reply_parameters: replyParams(replyToMessageId) };

  if (message.startsWith('err-')) {
    return context.reply(context.t(message), options);
  }

  sentry.captureException(error);

  return context.reply(context.t(ERR_GENERIC), options);
}

export async function withActionIndicator<T>(context: Context, fn: () => Promise<T>): Promise<T> {
  const typingInterval = setInterval(() => {
    if (!context.chatId) {
      return;
    }

    context.api.sendChatAction(context.chatId, 'upload_document').catch(() => undefined);
  }, 3_000);

  try {
    return await fn();
  } finally {
    clearInterval(typingInterval);
  }
}
