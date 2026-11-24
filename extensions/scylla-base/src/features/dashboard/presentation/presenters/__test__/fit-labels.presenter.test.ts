// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { fitLevels } from '../fit-labels.presenter.ts';

const cancel = { full: 70, short: 70, icon: 32 };
const save = { full: 170, short: 90, icon: 32 };

describe('fitLevels', () => {
  it('keeps the labels when they fit', () => {
    expect(fitLevels(300, 8, [cancel, save], [1, 0])).toEqual(['full', 'full']);
  });

  it('shortens the first action of the order, then gives it its icon, before the next one', () => {
    expect(fitLevels(200, 8, [cancel, save], [1, 0])).toEqual(['full', 'short']);
    expect(fitLevels(140, 8, [cancel, save], [1, 0])).toEqual(['full', 'icon']);
    expect(fitLevels(100, 8, [cancel, save], [1, 0])).toEqual(['icon', 'icon']);
  });

  it('skips a short label that is not narrower', () => {
    expect(fitLevels(60, 0, [cancel], [0])).toEqual(['icon']);
  });

  it('measures nothing yet: everything fits', () => {
    expect(fitLevels(0, 8, [{ full: 0, short: 0, icon: 0 }], [0])).toEqual(['full']);
  });
});
