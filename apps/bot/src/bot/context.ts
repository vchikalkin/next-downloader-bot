import type { Context as DefaultContext } from 'grammy';
import type { AutoChatActionFlavor } from '@grammyjs/auto-chat-action';
import type { CommandsFlavor } from '@grammyjs/commands';
import type { I18nFlavor } from '@grammyjs/i18n';
import type { logger } from '@/utils/logger';

export type Context = AutoChatActionFlavor &
  CommandsFlavor &
  DefaultContext &
  I18nFlavor & {
    logger: typeof logger;
  };
