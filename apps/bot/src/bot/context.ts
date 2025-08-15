import { type logger } from '@/utils/logger';
import { type AutoChatActionFlavor } from '@grammyjs/auto-chat-action';
import { type HydrateFlavor } from '@grammyjs/hydrate';
import { type I18nFlavor } from '@grammyjs/i18n';
import { type Context as DefaultContext } from 'grammy';

export type Context = HydrateFlavor<
  AutoChatActionFlavor &
    DefaultContext &
    I18nFlavor & {
      logger: typeof logger;
    }
>;
