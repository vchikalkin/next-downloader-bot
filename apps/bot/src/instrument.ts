import * as sentry from '@sentry/node';

// tsup define → production; local: NODE_ENV or unset → development
const isProd =
  process.env.SENTRY_BUILD_ENV === 'production' || process.env.NODE_ENV === 'production';

sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  environment: isProd ? 'production' : 'development',
  tracesSampleRate: isProd ? 0.1 : 1.0,
});
