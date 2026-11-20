import { describe, expect, it } from 'vitest';
import { panelSkeletonRows } from '../bell.presenter.ts';

const summary = (unread: number) => ({ unread, needsAction: 0, pollAfterSeconds: 30 });

describe('panelSkeletonRows', () => {
  it('has one row per unread row, because each unread row is in the list', () => {
    expect(panelSkeletonRows(summary(3))).toBe(3);
  });

  it('keeps one row with no unread row, and before the counts load', () => {
    expect(panelSkeletonRows(summary(0))).toBe(1);
    expect(panelSkeletonRows(undefined)).toBe(1);
  });

  it('stops at the rows that fit in the panel', () => {
    expect(panelSkeletonRows(summary(100))).toBe(8);
  });
});
