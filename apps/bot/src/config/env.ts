/* eslint-disable n/no-process-env */
import { z } from 'zod';

export const envSchema = z.object({
  BOT_TOKEN: z.string(),
  TELEGRAM_API_ROOT: z.string(),
});

export const env = envSchema.parse(process.env);
