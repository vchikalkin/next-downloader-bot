import type { Context } from '../context';
import type { ErrorHandler } from 'grammy';
import { getUpdateInfo } from '../helpers/logging';

export const errorHandler: ErrorHandler<Context> = (error) => {
  const { ctx } = error;

  ctx.logger.error({
    err: error.error,
    update: getUpdateInfo(ctx),
  });
};
