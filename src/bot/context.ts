import { logger } from '@/utils/logger';
import { HydrateFlavor } from '@grammyjs/hydrate';
import { I18nFlavor } from '@grammyjs/i18n';
import { Context as DefaultContext } from 'grammy';
import type { AutoChatActionFlavor } from '@grammyjs/auto-chat-action';

export type Context = HydrateFlavor<
  DefaultContext &
    AutoChatActionFlavor &
    I18nFlavor & {
      logger: typeof logger;
    }
>;
