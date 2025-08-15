import { type Context } from '../context';
import { getUpdateInfo } from '../helpers/logging';
import { type ErrorHandler } from 'grammy';

export const errorHandler: ErrorHandler<Context> = (error) => {
  const { ctx } = error;

  ctx.logger.error({
    err: error.error,
    update: getUpdateInfo(ctx),
  });
};
