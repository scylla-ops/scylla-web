// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { parsePeriodSearch, writePeriodSearch } from '../period-search.mapper.ts';

describe('period search', () => {
  it('reads a preset or the days of a period', () => {
    expect(parsePeriodSearch('?period=90d')).toBe('90d');
    expect(parsePeriodSearch('?from=2026-10-11&to=2026-11-09')).toEqual({
      from: '2026-10-11',
      to: '2026-11-09',
    });
  });

  it('gives the 30 days for no period or for a period that is not valid', () => {
    expect(parsePeriodSearch('')).toBe('30d');
    expect(parsePeriodSearch('?period=1y')).toBe('30d');
    expect(parsePeriodSearch('?from=2026-02-30&to=2026-03-09')).toBe('30d');
    expect(parsePeriodSearch('?from=2026-10-11')).toBe('30d');
  });

  it('writes the days of a period in place of a preset, and keeps the other parameters', () => {
    const period = { from: '2026-09-09', to: '2026-09-29' };

    expect(writePeriodSearch('?period=7d&tab=keys', period)).toBe(
      '?tab=keys&from=2026-09-09&to=2026-09-29',
    );
    expect(writePeriodSearch('?from=2026-09-09&to=2026-09-29', 'all')).toBe('?period=all');
  });

  it('writes nothing for the default preset', () => {
    expect(writePeriodSearch('?period=90d', '30d')).toBe('');
  });
});
