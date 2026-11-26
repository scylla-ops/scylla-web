// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { chipsThatFit } from '../folded-preview.presenter.ts';

describe('the chips of a folded section', () => {
  it('shows each chip when they all fit with no "+N"', () => {
    expect(chipsThatFit({ widths: [80, 80, 80], available: 260, gap: 6, more: 40, total: 3 })).toBe(
      3,
    );
  });

  it('keeps the place of "+N" after the last chip that shows', () => {
    // 80 + 6 + 80 = 166, and "+N" needs 6 + 40 more: 212 fits, a third chip does not.
    expect(chipsThatFit({ widths: [80, 80, 80], available: 240, gap: 6, more: 40, total: 3 })).toBe(
      2,
    );
  });

  it('counts the projects that are not loaded in "+N"', () => {
    // Each loaded chip fits, but 9 more projects need their "+N".
    expect(chipsThatFit({ widths: [80, 80], available: 170, gap: 6, more: 40, total: 11 })).toBe(1);
  });

  it('can show "+N" alone on a narrow line', () => {
    expect(chipsThatFit({ widths: [120], available: 100, gap: 6, more: 40, total: 4 })).toBe(0);
  });

  it('shows the chips when the line has no size yet', () => {
    expect(chipsThatFit({ widths: [0, 0], available: 0, gap: 0, more: 0, total: 5 })).toBe(2);
  });
});
