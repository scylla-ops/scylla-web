// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { parsePeriodSearch, writePeriodSearch } from '../period-search.mapper.ts';

describe('parsePeriodSearch', () => {
  it.each(['24h', '7d', '14d', '30d'] as const)('reads the preset %s', kind => {
    expect(parsePeriodSearch(`?period=${kind}`)).toEqual({ kind });
  });

  it('reads the days of a custom period', () => {
    expect(parsePeriodSearch('?from=2026-11-01&to=2026-11-14')).toEqual({
      kind: 'custom',
      from: '2026-11-01',
      to: '2026-11-14',
    });
  });

  it('prefers the days to a preset', () => {
    expect(parsePeriodSearch('?period=7d&from=2026-11-01&to=2026-11-02')).toMatchObject({
      kind: 'custom',
    });
  });

  it.each([
    '',
    '?period=custom',
    '?period=90d',
    '?from=2026-11-01',
    '?from=2026-02-30&to=2026-03-01',
    '?from=yesterday&to=today',
  ])('gives null for %j', search => {
    expect(parsePeriodSearch(search)).toBeNull();
  });
});

describe('writePeriodSearch', () => {
  it('writes a preset and keeps the other parameters', () => {
    expect(writePeriodSearch('?tab=1', { kind: '7d' })).toBe('?tab=1&period=7d');
  });

  it('writes no parameter for the default period', () => {
    expect(writePeriodSearch('?period=7d', { kind: '14d' })).toBe('');
  });

  it('replaces a preset with the days of a custom period', () => {
    expect(
      writePeriodSearch('?period=30d', { kind: 'custom', from: '2026-11-01', to: '2026-11-14' }),
    ).toBe('?from=2026-11-01&to=2026-11-14');
  });

  it('reads back what it writes', () => {
    const period = { kind: 'custom', from: '2026-10-01', to: '2026-10-31' } as const;

    expect(parsePeriodSearch(writePeriodSearch('', period))).toEqual(period);
  });
});
