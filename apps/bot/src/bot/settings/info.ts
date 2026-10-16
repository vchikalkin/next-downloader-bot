import type { Bot } from 'grammy';
import type { LanguageCode } from '@grammyjs/types';
import { env } from '@/config/env';
import { BOT_NAME, DESCRIPTION, SHORT_DESCRIPTION } from '@/constants/i18n';
import type { Context } from '../context';
import { i18n } from '../i18n';

async function applyProfile(api: Bot<Context>['api'], locale: string, languageCode?: LanguageCode) {
  const options = languageCode ? { language_code: languageCode } : undefined;
  const donateLink = env.DONATE_LINK;

  await api.setMyName(i18n.t(locale, BOT_NAME), options);
  await api.setMyDescription(i18n.t(locale, DESCRIPTION, { donateLink }), options);
  await api.setMyShortDescription(i18n.t(locale, SHORT_DESCRIPTION, { donateLink }), options);
}

export async function setInfo({ api }: Bot<Context>) {
  for (const locale of i18n.locales) {
    await applyProfile(api, locale, locale as LanguageCode);
  }

  // ponytail: catalogs scrape the no-language profile. Keep Russian, it is the live listing.
  await applyProfile(api, 'ru');
}
