// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { decidedJobs, successRate, successRateChange } from '../job-stats.struct.ts';

const outcomes = (completed: number, failed: number, cancelled = 0, orphaned = 0) => ({
  completed,
  failed,
  cancelled,
  orphaned,
});

describe('successRate', () => {
  it('divides the completed jobs by the completed, failed and orphaned jobs', () => {
    expect(successRate(outcomes(146, 15, 5, 3))).toBeCloseTo(146 / 164);
  });

  it('does not count the cancelled jobs', () => {
    expect(successRate(outcomes(3, 1, 50))).toBe(0.75);
    expect(decidedJobs(outcomes(3, 1, 50))).toBe(4);
  });

  it('counts an orphaned job as a failure', () => {
    expect(successRate(outcomes(1, 0, 0, 1))).toBe(0.5);
  });

  it('gives null when no job counts, also when jobs were cancelled', () => {
    expect(successRate(outcomes(0, 0))).toBeNull();
    expect(successRate(outcomes(0, 0, 4))).toBeNull();
  });

  it('gives 0 when each job failed', () => {
    expect(successRate(outcomes(0, 2))).toBe(0);
  });
});

describe('successRateChange', () => {
  it('gives the change in points of percent', () => {
    expect(successRateChange(outcomes(9, 1), outcomes(8, 2))).toBeCloseTo(10);
    expect(successRateChange(outcomes(1, 1), outcomes(3, 1))).toBeCloseTo(-25);
  });

  it('gives 0 when the rate does not change', () => {
    expect(successRateChange(outcomes(2, 2), outcomes(5, 5))).toBe(0);
  });

  it('gives null when a period has no rate', () => {
    expect(successRateChange(outcomes(1, 0), outcomes(0, 0, 3))).toBeNull();
    expect(successRateChange(outcomes(0, 0), outcomes(1, 0))).toBeNull();
  });
});
