import { createBot } from './bot';
import { env as environment } from './config/env';
import { logger } from './utils/logger';
import { getRedisInstance } from './utils/redis';
import { run } from '@grammyjs/runner';

const bot = createBot({
  apiRoot: environment.TELEGRAM_API_ROOT,
  token: environment.BOT_TOKEN,
});

const runner = run(bot);

const redis = getRedisInstance();

// Graceful shutdown function
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  try {
    // Stop the bot
    await runner.stop();
    logger.info('Bot stopped');

    // Disconnect Redis
    redis.disconnect();
    logger.info('Redis disconnected');
  } catch (error) {
    const err_ = error as Error;
    logger.error('Error during graceful shutdown:' + err_.message || '');
  }
}

// Stopping the bot when the Node.js process
// is about to be terminated
process.once('SIGINT', () => gracefulShutdown('SIGINT'));
process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));

logger.info('Bot started');
