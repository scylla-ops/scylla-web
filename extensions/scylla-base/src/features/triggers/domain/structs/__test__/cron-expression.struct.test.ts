// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { cronFieldCount, isCronExpressionValid } from '../cron-expression.struct.ts';

describe('cronFieldCount', () => {
  it('counts whitespace-separated fields', () => {
    expect(cronFieldCount('30 9 * * *')).toBe(5);
    expect(cronFieldCount('  30   9  *  *  * ')).toBe(5);
  });

  it('is 0 for an empty (or all-whitespace) expression', () => {
    expect(cronFieldCount('')).toBe(0);
    expect(cronFieldCount('   ')).toBe(0);
  });
});

describe('isCronExpressionValid', () => {
  it('requires exactly 5 fields', () => {
    expect(isCronExpressionValid('30 9 * * *')).toBe(true);
    expect(isCronExpressionValid('30 9 * *')).toBe(false);
    expect(isCronExpressionValid('30 9 * * * *')).toBe(false);
    expect(isCronExpressionValid('')).toBe(false);
  });
});
