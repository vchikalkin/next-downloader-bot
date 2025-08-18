import { type Context } from '../context';
import { type NextFunction } from 'grammy';

export async function setInfo(ctx: Context, next: NextFunction) {
  await ctx.api.setMyDescription(ctx.t('description'));
  await ctx.api.setMyShortDescription(ctx.t('short-description'));

  return next();
}
