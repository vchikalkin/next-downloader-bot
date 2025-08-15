/* eslint-disable n/no-process-env */
/* eslint-disable turbo/no-undeclared-env-vars */
import pino from 'pino';

export const logger = pino({
  transport: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    options: {
      colorize: true,
      translateTime: true,
    },
    target: 'pino-pretty',
  },
});
