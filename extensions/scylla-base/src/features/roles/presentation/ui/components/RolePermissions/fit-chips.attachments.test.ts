// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { fitCount } from './fit-chips.attachments.ts';

describe('fitCount', () => {
  it('keeps every chip when they all fit, with no room for the pill', () => {
    expect(fitCount([100, 100, 100], 312, 6, 30)).toBe(3);
  });

  it('keeps the chips that fit beside the pill when some do not fit', () => {
    expect(fitCount([100, 100, 100, 100], 250, 6, 30)).toBe(2);
  });

  it('keeps no chip when the first one does not fit beside the pill', () => {
    expect(fitCount([300, 100], 250, 6, 30)).toBe(0);
  });
});
