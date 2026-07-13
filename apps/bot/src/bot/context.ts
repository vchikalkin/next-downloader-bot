/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { Context as DefaultContext, SessionFlavor } from 'grammy';
import type { AutoChatActionFlavor } from '@grammyjs/auto-chat-action';
import type { CommandsFlavor } from '@grammyjs/commands';
import type { HydrateFlavor } from '@grammyjs/hydrate';
import type { I18nFlavor } from '@grammyjs/i18n';
import type { logger } from '@/utils/logger';

export type Context = HydrateFlavor<
  AutoChatActionFlavor &
    CommandsFlavor &
    DefaultContext &
    I18nFlavor &
    SessionFlavor<SessionData> & {
      logger: typeof logger;
    }
>;

export interface SessionData {}
