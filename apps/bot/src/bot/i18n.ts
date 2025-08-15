import { type Context } from './context';
import { I18n } from '@grammyjs/i18n';
import path from 'node:path';

export const i18n = new I18n<Context>({
  defaultLocale: 'en',
  directory: path.resolve(process.cwd(), 'locales'),
  fluentBundleOptions: {
    useIsolating: false,
  },
  useSession: true,
});

export const isMultipleLocales = i18n.locales.length > 1;
