// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { dailyCountsOf, isIncident, successRate, sumOutcomes } from '../agent-stats.struct.ts';

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

  it('makes a day with 3 failed or orphaned jobs an incident', () => {
    expect(isIncident(outcomes(9, 2))).toBe(false);
    expect(isIncident({ ...outcomes(0, 1), orphaned: 2 })).toBe(true);
  });
});

describe('dailyCountsOf', () => {
  const outcomes = { completed: 3, failed: 1, cancelled: 0, orphaned: 0 };

  it('gives one flat entry for each day', () => {
    const days = [{ day: '2026-11-04T00:00:00.000Z', outcomes }];
    const stats = { agentId: 'a', outcomes, medianMs: null, p95Ms: null, days };

    expect(dailyCountsOf(stats)).toEqual([{ day: '2026-11-04T00:00:00.000Z', ...outcomes }]);
  });

  it('gives nothing for an agent with no job', () => {
    expect(dailyCountsOf(undefined)).toEqual([]);
  });
});
