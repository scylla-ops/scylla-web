import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { flushSync } from 'svelte';
import { i18n } from '@lingui/core';
import { formatNumber, intlLocale } from '../locale-format.ts';

const ONE_DIGIT = { minimumFractionDigits: 1, maximumFractionDigits: 1 };

/** French puts a no-break space, U+00A0 or U+202F after the version of ICU. */
const spaced = (text: string): string => text.replace(/\s/gu, ' ');

beforeAll(() => i18n.load('fr', {}));

afterEach(() => i18n.activate('en'));

describe('formatNumber', () => {
  it('writes a decimal, a percent and a large number in English', () => {
    expect(formatNumber(0.7, ONE_DIGIT)).toBe('0.7');
    expect(formatNumber(0.89, { style: 'percent' })).toBe('89%');
    expect(formatNumber(1312)).toBe('1,312');
  });

  it('writes a decimal, a percent and a large number in French', () => {
    i18n.activate('fr');

    expect(formatNumber(0.7, ONE_DIGIT)).toBe('0,7');
    expect(spaced(formatNumber(0.89, { style: 'percent' }))).toBe('89 %');
    expect(spaced(formatNumber(1312))).toBe('1 312');
  });

  it('follows a switch of the language in a derived value', () => {
    let shown = '';
    const stop = $effect.root(() => {
      const perDay = $derived(`${formatNumber(0.7, ONE_DIGIT)} · ${intlLocale()}`);
      $effect(() => {
        shown = perDay;
      });
    });
    flushSync();
    expect(shown).toBe('0.7 · en');

    i18n.activate('fr');
    flushSync();

    expect(shown).toBe('0,7 · fr');
    stop();
  });
});
