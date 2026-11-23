// @vitest-environment node
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { i18n } from '@lingui/core';
import { memoryText, percentText } from '../agent-figures.presenter.ts';

/** French puts a no-break space, U+00A0 or U+202F after the version of ICU. */
const spaced = (text: string): string => text.replace(/\s/gu, ' ');

beforeAll(() => i18n.load('fr', {}));

afterEach(() => i18n.activate('en'));

describe('the figures of an agent', () => {
  it('writes the success rate and the memory in English', () => {
    expect(percentText(1)).toBe('100%');
    expect(percentText(0.954)).toBe('95%');
    expect(percentText(null)).toBe('–');
    expect(memoryText(24 * 1024)).toBe('24 GB');
  });

  it('writes the success rate and the memory in French', () => {
    i18n.activate('fr');

    expect(spaced(percentText(1))).toBe('100 %');
    expect(spaced(memoryText(24 * 1024))).toBe('24 Go');
  });
});
