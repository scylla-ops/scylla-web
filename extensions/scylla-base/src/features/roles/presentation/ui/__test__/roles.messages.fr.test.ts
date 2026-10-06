// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { i18n } from '@lingui/core';
import { withLocale } from '@test/i18n.ts';
import { messages } from '../../../locales/fr/messages.ts';
import { rolesMessages } from '../roles.messages.ts';

/** French needs no elision before any name: "de l'organisation Acme", never "de Acme". */
withLocale('fr', messages);

describe('roles messages with an organization name, in French', () => {
  it.each([
    [rolesMessages.organizationRoles('Acme'), "Rôles de l'organisation Acme"],
    [
      rolesMessages.organizationRolesCaption('Acme'),
      "Créés par les administrateurs de l'organisation Acme. Ils ne sont visibles et accordés que dans Acme.",
    ],
    [
      rolesMessages.organizationPeopleHint('Acme'),
      "Les membres de l'organisation Acme. Une application ne peut pas le détenir.",
    ],
    [
      rolesMessages.organizationAppsHint('Acme'),
      "Les applications de l'organisation Acme, comme les agents. Une personne ne peut pas le détenir.",
    ],
  ])('renders %#', (descriptor, text) => {
    expect(i18n._(descriptor)).toBe(text);
  });
});
