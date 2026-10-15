import * as sentry from '@sentry/node';

sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  // tsup define → production; local tsx → development
  environment: process.env.SENTRY_BUILD_ENV === 'production' ? 'production' : 'development',
  // ponytail: 1.0 for usable unique-user counts; lower in production if quota hurts
  tracesSampleRate: 1.0,
});
