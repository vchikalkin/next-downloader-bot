import * as sentry from '@sentry/node';
import { ERR_GENERIC } from '@/constants/i18n';
import type { Context } from '../../context';

export interface ReplyTarget {
  messageId?: number;
  quote?: string;
  quotePosition?: number;
}

export function replyParams(target?: ReplyTarget) {
  if (!target?.messageId) {
    return undefined;
  }

  return {
    message_id: target.messageId,
    ...(target.quote !== undefined && target.quotePosition !== undefined
      ? { quote: target.quote, quote_position: target.quotePosition }
      : {}),
  };
}

export function createMessageDeleter(context: Context, messageId: number) {
  return async () => {
    try {
      if (context.chatId) {
        await context.api.deleteMessage(context.chatId, messageId);
      }
    } catch {
      // Ignore if we can't delete
    }
  };
}

export async function replyDownloadError(
  context: Context,
  error: unknown,
  target?: ReplyTarget,
) {
  const message = error instanceof Error ? error.message : String(error);
  const options = { reply_parameters: replyParams(target) };

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
