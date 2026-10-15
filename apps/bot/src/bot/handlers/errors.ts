import type { ErrorHandler } from 'grammy';
import * as sentry from '@sentry/node';
import { ERR_GENERIC } from '@/constants/i18n';
import type { Context } from '../context';
import { getUpdateInfo } from '../helpers/logging';

export const errorHandler: ErrorHandler<Context> = async (error) => {
  const { ctx } = error;

  sentry.captureException(error.error);

  await ctx.reply(ctx.t(ERR_GENERIC));

  ctx.logger.error({
    err: error.error,
    update: getUpdateInfo(ctx),
  });
};
