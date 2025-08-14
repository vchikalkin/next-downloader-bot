import { createBot } from './bot';
import { env } from './config/env';
import { logger } from './utils/logger';

const bot = createBot({
  token: env.BOT_TOKEN,
  apiRoot: env.TELEGRAM_API_ROOT,
});

// Stopping the bot when the Node.js process
// is about to be terminated
process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());

bot.start({
  onStart: (bot) => logger.info(`Bot ${bot.username} started`),
});
