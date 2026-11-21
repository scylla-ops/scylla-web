import { afterEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@lingui/core';
import {
  chooseAppLocale,
  getStoredLocale,
  plainMessage,
  readCatalogs,
  registerCatalogs,
  setAppLocale,
} from '../i18n.ts';

const LOCALE_KEY = 'scylla-locale';

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

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

describe('the locale of the browser', () => {
  it('reads the language of the browser when the person chose nothing', () => {
    vi.stubGlobal('navigator', { language: 'fr-CA' });

    expect(getStoredLocale()).toBe('fr');
    expect(localStorage.getItem(LOCALE_KEY)).toBeNull();
  });

  it('shows a language at the load of a page, and writes nothing in the browser', async () => {
    await setAppLocale('fr');

    expect(i18n.locale).toBe('fr');
    expect(document.documentElement.lang).toBe('fr');
    expect(localStorage.getItem(LOCALE_KEY)).toBeNull();
    await setAppLocale('en');
  });

  it('keeps the choice of the person, and reads it before the language of the browser', async () => {
    vi.stubGlobal('navigator', { language: 'en-US' });

    await chooseAppLocale('fr');

    expect(i18n.locale).toBe('fr');
    expect(localStorage.getItem(LOCALE_KEY)).toBe('fr');
    expect(getStoredLocale()).toBe('fr');
    await setAppLocale('en');
  });
});
