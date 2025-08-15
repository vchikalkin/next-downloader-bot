import { createBot } from './bot';
import { env as environment } from './config/env';
import { logger } from './utils/logger';

const bot = createBot({
  apiRoot: environment.TELEGRAM_API_ROOT,
  token: environment.BOT_TOKEN,
});

// Stopping the bot when the Node.js process
// is about to be terminated
process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());

await bot.start({
  onStart: ({ username }) => logger.info(`Bot ${username} started`),
});
