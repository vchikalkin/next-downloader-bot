import { createBot } from './bot';
import { env as environment } from './config/env';
import { logger } from './utils/logger';
import { getRedisInstance } from './utils/redis';
import { run } from '@grammyjs/runner';

const bot = createBot({
  apiRoot: environment.TELEGRAM_API_ROOT,
  token: environment.BOT_TOKEN,
});

bot.catch((error) => {
  logger.error('Grammy bot error:');
  logger.error(`Message: ${error?.message}`);
  logger.error(error.error);
});

const runner = run(bot);
const redis = getRedisInstance();

async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  try {
    await runner.stop();
    logger.info('Bot stopped');

    redis.disconnect();
    logger.info('Redis disconnected');
  } catch (error) {
    const err_ = error as Error;
    logger.error('Error during graceful shutdown:' + err_.message || '');
  }
}

process.once('SIGINT', () => gracefulShutdown('SIGINT'));
process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection: ' + reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception: ' + error);
});

logger.info('Bot started');
