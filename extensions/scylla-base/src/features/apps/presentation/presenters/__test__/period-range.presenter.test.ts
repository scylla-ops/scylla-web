import { describe, it, expect } from 'vitest';
import { periodRange } from '../period-range.presenter.ts';

describe('periodRange', () => {
  it('names the last day today when the period ends today', () => {
    expect(periodRange({ from: '2026-10-11', to: '2026-11-09' }, '2026-11-09')).toBe(
      'Oct 11 – Today',
    );
  });

  it('gives both days of an older period, and one day for a period of one day', () => {
    expect(periodRange({ from: '2026-09-09', to: '2026-09-29' }, '2026-11-09')).toBe(
      'Sep 9 – Sep 29',
    );
    expect(periodRange({ from: '2026-11-09', to: '2026-11-09' }, '2026-11-09')).toBe('Today');
  });
});
