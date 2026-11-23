// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { i18n } from '@lingui/core';
import { messages } from '@base/features/triggers/locales/fr/messages.ts';
import { triggersMessages } from '../triggers.messages.ts';

i18n.load('fr', messages);

afterEach(() => i18n.activate('en'));

describe('the ID of a trigger', () => {
  it('puts the colon right after the label in English', () => {
    expect(i18n._(triggersMessages.idOf('c6c7'))).toBe('ID: c6c7');
  });

  it('puts a no-break space before the colon in French', () => {
    i18n.activate('fr');

    expect(i18n._(triggersMessages.idOf('c6c7'))).toBe('ID\u00a0: c6c7');
  });
});
