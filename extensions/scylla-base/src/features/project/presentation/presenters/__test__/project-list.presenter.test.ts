// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  batchesOf,
  healthOfParam,
  nextBatchSize,
  orderOfParam,
} from '../project-list.presenter.ts';

const ids = (count: number) => Array.from({ length: count }, (_, index) => `p-${index}`);

describe('batchesOf', () => {
  it('cuts the first batch, then one batch of 12 for each "Show more"', () => {
    const batches = batchesOf(ids(31), 6);

    expect(batches.map(batch => batch.length)).toEqual([6, 12, 12, 1]);
    expect(batches[1][0]).toBe('p-6');
    expect(batches.flat()).toEqual(ids(31));
  });

  it('gives one batch for a short list, and none for an empty one', () => {
    expect(batchesOf(ids(2), 3)).toEqual([['p-0', 'p-1']]);
    expect(batchesOf([], 6)).toEqual([]);
  });
});

describe('nextBatchSize', () => {
  it('adds 12 cards, or what is left', () => {
    expect(nextBatchSize(6, 43)).toBe(12);
    expect(nextBatchSize(42, 43)).toBe(1);
    expect(nextBatchSize(43, 43)).toBe(0);
  });
});

describe('the parameters of the URL', () => {
  it('reads a known health or order, and falls back to each project in the custom order', () => {
    expect(healthOfParam('failed')).toBe('failed');
    expect(healthOfParam('running')).toBe('running');
    expect(healthOfParam('green')).toBe('all');
    expect(orderOfParam('last-job')).toBe('last-job');
    expect(orderOfParam('failed-first')).toBe('failed-first');
    expect(orderOfParam('name')).toBe('name');
    expect(orderOfParam('position')).toBe('position');
    expect(orderOfParam('')).toBe('position');
  });
});
