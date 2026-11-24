import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import { i18n } from '@lingui/core';
import { getRelativeTime } from '../date-utils';

/** French puts a no-break space, U+00A0 or U+202F after the version of ICU. */
const spaced = (text: string): string => text.replace(/\s/gu, ' ');

beforeAll(() => i18n.load('fr', {}));

afterEach(() => {
  i18n.activate('en');
  vi.useRealTimers();
});

describe('a relative time on the page', () => {
  it('follows a switch of the language without a new render', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-23T10:33:00.000Z'));
    let shown = '';
    const stop = $effect.root(() => {
      const ago = $derived(getRelativeTime('2026-11-23T10:00:00.000Z'));
      $effect(() => {
        shown = ago;
      });
    });
    flushSync();
    expect(shown).toBe('33 min. ago');

    i18n.activate('fr');
    flushSync();

    expect(spaced(shown)).toBe('il y a 33 min');
    stop();
  });
});
