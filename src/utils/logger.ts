import pino from 'pino';

export const logger = pino({
  transport: {
    target: 'pino-pretty',
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    options: {
      colorize: true,
      translateTime: true,
    },
  },
});
