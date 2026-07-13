import type { Context } from '../../context';

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

export async function replyDownloadError(context: Context, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.startsWith('err-')) {
    return context.reply(context.t(message));
  }

  return context.reply(context.t('err-generic'));
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
