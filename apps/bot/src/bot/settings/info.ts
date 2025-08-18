import { type Context } from '../context';
import { i18n } from '../i18n';
import { type Api, type Bot, type RawApi } from 'grammy';

export async function setInfo({ api }: Bot<Context, Api<RawApi>>) {
  for (const locale of i18n.locales) {
    await api.setMyDescription(i18n.t(locale, 'description'));
    await api.setMyShortDescription(i18n.t(locale, 'short-description'));
  }
}
