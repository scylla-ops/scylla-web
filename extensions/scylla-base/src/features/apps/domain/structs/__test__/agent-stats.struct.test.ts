// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { successRate, sumOutcomes } from '../agent-stats.struct.ts';

const outcomes = (completed: number, failed: number) => ({
  completed,
  failed,
  cancelled: 0,
  orphaned: 0,
});

describe('agent stats', () => {
  it('gives the part of the ended jobs that completed, and none with no ended job', () => {
    expect(successRate(outcomes(3, 1))).toBe(0.75);
    expect(successRate(outcomes(0, 0))).toBeNull();
  });

  it('adds the outcomes of some agents', () => {
    expect(sumOutcomes([outcomes(1, 2), outcomes(3, 0)])).toEqual(outcomes(4, 2));
  });
});
