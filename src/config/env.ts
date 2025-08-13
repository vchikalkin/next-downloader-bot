/* eslint-disable n/no-process-env */
import { z } from 'zod';

export const envSchema = z.object({
  BOT_TOKEN: z.string(),
  BOT_URL: z.string(),
});

export const env = envSchema.parse(process.env);
