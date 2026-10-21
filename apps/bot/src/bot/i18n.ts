import path from 'node:path';
import { I18n } from '@grammyjs/i18n';
import type { Context } from './context';

// ponytail: no session — locale from ctx.from.language_code (Telegram client).
export const i18n = new I18n<Context>({
  defaultLocale: 'en',
  directory: path.resolve(process.cwd(), 'locales'),
  fluentBundleOptions: {
    useIsolating: false,
  },
  useSession: false,
});
