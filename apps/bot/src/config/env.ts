/* eslint-disable n/no-process-env */
import { z } from 'zod';

export const envSchema = z.object({
  BOT_TOKEN: z.string(),
  RATE_LIMIT: z
    .string()
    .transform((value) => Number.parseInt(value, 10))
    .default('5000'),
  REDIS_HOST: z.string(),
  REDIS_PASSWORD: z.string(),
  REDIS_PORT: z
    .string()
    .transform((value) => Number.parseInt(value, 10))
    .default('6379'),
  TELEGRAM_API_ROOT: z.string(),
});

export const env = envSchema.parse(process.env);
