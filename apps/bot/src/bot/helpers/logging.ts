import type { Middleware } from 'grammy';
import { omit } from 'radashi';
import type { Update } from '@grammyjs/types';
import type { Context } from '../context';

export function getUpdateInfo(context: Context): Omit<Update, 'update_id'> {
  return omit(context.update, ['update_id']);
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
