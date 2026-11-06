import { describe, expect, it } from 'vitest';
import { i18n } from '@lingui/core';
import { plainMessage, readCatalogs, registerCatalogs } from '../i18n.ts';

describe('readCatalogs', () => {
  it('reads the messages of one locale, and does not activate them', async () => {
    registerCatalogs({
      '/one/locales/en/messages.ts': () => Promise.resolve({ messages: { greeting: 'Hello' } }),
      '/one/locales/fr/messages.ts': () => Promise.resolve({ messages: { greeting: 'Bonjour' } }),
      '/two/locales/fr/messages.ts': () => Promise.resolve({ messages: { farewell: 'Au revoir' } }),
    });
    const before = i18n.locale;

    const catalog = await readCatalogs('fr');

    expect(catalog).toMatchObject({ greeting: 'Bonjour', farewell: 'Au revoir' });
    expect(i18n.locale).toBe(before);
    expect(i18n.messages.greeting).toBeUndefined();
  });
});

describe('plainMessage', () => {
  it('gives the text of a simple message', () => {
    expect(plainMessage({ greeting: 'Hello' }, 'greeting')).toBe('Hello');
  });

  it('keeps only the text of a message with a value', () => {
    expect(plainMessage({ greeting: ['Hello ', ['name'], '!'] }, 'greeting')).toBe('Hello !');
  });

  it('gives nothing for an unknown message or no id', () => {
    expect(plainMessage({}, 'greeting')).toBeUndefined();
    expect(plainMessage({ greeting: 'Hello' }, undefined)).toBeUndefined();
  });
});
