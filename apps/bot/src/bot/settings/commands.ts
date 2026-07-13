import type { Bot } from 'grammy';
import { Command, CommandGroup } from '@grammyjs/commands';
import type { LanguageCode } from '@grammyjs/types';
import type { Context } from '@/bot/context';
import { i18n } from '@/bot/i18n';

function createCommand(name: string) {
  return new Command(name, i18n.t('en', `${name}.description`)).addToScope({
    type: 'all_private_chats',
  });
}

function addLocalizations(command: Command) {
  for (const locale of i18n.locales) {
    command.localize(
      locale as LanguageCode,
      command.name,
      i18n.t(locale, `${String(command.name)}.description`),
    );
  }

  return command;
}

export async function setCommands({ api }: Bot<Context>) {
  const start = createCommand('start');

  const commands = [start];

  for (const command of commands) {
    addLocalizations(command);
  }

  const commandsGroup = new CommandGroup().add([start]);

  await commandsGroup.setCommands({ api });
}
