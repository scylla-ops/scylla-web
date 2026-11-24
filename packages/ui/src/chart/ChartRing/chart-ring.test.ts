// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { RING_ARC_GAP, RING_MIN_ARC, ringArcs } from './chart-ring.ts';

describe('ringArcs', () => {
  it('fills the share of the total, from the top, with no gap for one arc', () => {
    expect(ringArcs([{ value: 89, tone: 'passed' }], 100)).toEqual([
      { tone: 'passed', start: 0, length: 89 },
    ]);
  });

  it('puts the arcs one after the other, with a gap after each', () => {
    const arcs = ringArcs(
      [
        { value: 146, tone: 'passed' },
        { value: 15, tone: 'failed' },
        { value: 3, tone: 'queued' },
      ],
      164,
    );

    expect(arcs.map(arc => arc.tone)).toEqual(['passed', 'failed', 'queued']);
    expect(arcs[0].start).toBe(0);
    expect(arcs[1].start).toBeCloseTo((146 / 164) * 100);
    expect(arcs[2].start).toBeCloseTo((161 / 164) * 100);
    expect(arcs[0].length).toBeCloseTo((146 / 164) * 100 - RING_ARC_GAP);
  });

  it('keeps a very small part visible', () => {
    const arcs = ringArcs(
      [
        { value: 999, tone: 'passed' },
        { value: 1, tone: 'failed' },
      ],
      1000,
    );

    expect(arcs[1].length).toBe(RING_MIN_ARC);
  });

  it('takes the sum as the scale when the arcs are more than the total', () => {
    const arcs = ringArcs(
      [
        { value: 3, tone: 'passed' },
        { value: 1, tone: 'failed' },
      ],
      2,
      0,
    );

    expect(arcs).toEqual([
      { tone: 'passed', start: 0, length: 75 },
      { tone: 'failed', start: 75, length: 25 },
    ]);
  });

  it('draws at most three arcs and no arc of 0', () => {
    const arcs = ringArcs(
      [
        { value: 1, tone: 'passed' },
        { value: 0, tone: 'failed' },
        { value: 1, tone: 'queued' },
        { value: 1, tone: 'info' },
      ],
      4,
    );

    expect(arcs.map(arc => arc.tone)).toEqual(['passed', 'queued']);
  });

  it('draws no arc for an empty total', () => {
    expect(ringArcs([], 0)).toEqual([]);
    expect(ringArcs([{ value: 0, tone: 'passed' }], 0)).toEqual([]);
  });
});
