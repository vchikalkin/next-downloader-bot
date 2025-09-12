import { type Context } from '../context';
import { getUpdateInfo } from '../helpers/logging';
import { type ErrorHandler } from 'grammy';

export const errorHandler: ErrorHandler<Context> = async (error) => {
  const { ctx } = error;

  await ctx.reply(ctx.t('err-generic'));

  ctx.logger.error({
    err: error.error,
    update: getUpdateInfo(ctx),
  });
};
