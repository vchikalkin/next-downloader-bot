import createLogger from 'pino';

export const logger = createLogger({
  transport: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    options: {
      colorize: true,
      translateTime: true,
    },
    target: 'pino-pretty',
  },
});
