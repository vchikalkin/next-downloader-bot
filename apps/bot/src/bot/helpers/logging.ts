/* eslint-disable @typescript-eslint/no-unused-vars */
import { type Context } from '../context';
import { type Update } from '@grammyjs/types';
import { type Middleware } from 'grammy';

export function getUpdateInfo(context: Context): Omit<Update, 'update_id'> {
  const { update_id, ...update } = context.update;

  return update;
}

export function logHandle(id: string): Middleware<Context> {
  return (context, next) => {
    context.logger.info({
      msg: `Handle "${id}"`,
      ...(id.startsWith('unhandled') ? { update: getUpdateInfo(context) } : {}),
    });

    return next();
  };
}
