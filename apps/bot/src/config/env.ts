/* eslint-disable n/no-process-env */
import { z } from 'zod';

export const envSchema = z.object({
  BOT_TOKEN: z.string(),
  RATE_LIMIT: z
    .string()
    .transform((value) => Number.parseInt(value, 10))
    .default('2'),
  RATE_LIMIT_TIME: z
    .string()
    .transform((value) => Number.parseInt(value, 10))
    .default('3000'),
  REDIS_HOST: z.string().default('redis'),
  REDIS_PASSWORD: z.string(),
  REDIS_PORT: z
    .string()
    .transform((value) => Number.parseInt(value, 10))
    .default('6379'),
  TELEGRAM_API_ROOT: z.string(),
});

export const env = envSchema.parse(process.env);
