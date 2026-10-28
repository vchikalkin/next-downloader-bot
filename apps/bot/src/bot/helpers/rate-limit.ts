import type { Context } from '../context';
import { linksFromMessage } from '../features/download/extract';
import { isBotMentionReply } from '../features/download/group';

/**
 * Rate-limit key for updates that can start a download; `undefined` skips the limiter.
 * Forwarded albums arrive as one update per photo, so counting every message
 * would trip the limit without any link being sent.
 */
export function downloadRequestKey(context: Context): string | undefined {
  const { message } = context;

  if (!message || !context.from) {
    return undefined;
  }

  const source = isBotMentionReply(context) ? message.reply_to_message : message;

  if (!source || linksFromMessage(source).length === 0) {
    return undefined;
  }

  return context.from.id.toString();
}
