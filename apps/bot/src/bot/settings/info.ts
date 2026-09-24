import type { Bot } from 'grammy';
import { env } from '@/config/env';
import { DESCRIPTION, SHORT_DESCRIPTION } from '@/constants/i18n';
import type { Context } from '../context';
import { i18n } from '../i18n';

export async function setInfo({ api }: Bot<Context>) {
  for (const locale of i18n.locales) {
    await api.setMyDescription(i18n.t(locale, DESCRIPTION));
    await api.setMyShortDescription(
      i18n.t(locale, SHORT_DESCRIPTION, { donateLink: env.DONATE_LINK }),
    );
  }
}
