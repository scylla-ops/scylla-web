import { i18n } from '@lingui/core';
import { roleMessages } from '../messages/access.messages.ts';

/** The translated name of a role. An unknown role (of an edition) shows as it is, humanized. */
export const roleLabel = (role: string): string => {
  const message = roleMessages[role];
  if (message) return i18n._(message);
  const words = role.replace(/[_-]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};
