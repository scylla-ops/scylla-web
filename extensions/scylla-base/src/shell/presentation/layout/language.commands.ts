import { msg } from '@lingui/core/macro';
import type { MessageDescriptor } from '@lingui/core';
import LanguagesIcon from '@lucide/svelte/icons/languages';
import type { ChoiceCommand } from '@scylla/core-sdk';
import { activeLocale, type SupportedLocale } from '@scylla/ui/i18n';
import { layoutMessages } from './messages/layout.messages.ts';
import { chooseLocale } from './user-preferences.ts';

const language = (
  locale: SupportedLocale,
  title: MessageDescriptor,
  keywords: MessageDescriptor,
): ChoiceCommand => ({
  id: `shell.language-${locale}`,
  kind: 'choice',
  type: layoutMessages.language,
  title,
  keywords,
  icon: LanguagesIcon,
  current: () => activeLocale() === locale,
  select: () => chooseLocale(locale),
});

export const languageCommands = [
  language('en', msg`English`, msg`english language`),
  language('fr', msg`Français`, msg`french language`),
];
