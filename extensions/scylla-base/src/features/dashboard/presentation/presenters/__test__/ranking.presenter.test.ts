import { describe, it, expect } from 'vitest';
import type { JobFigures, JobGroup } from '@base/features/jobs';
import { rankingRows } from '../ranking.presenter.ts';

const figures = (overrides: Partial<JobFigures> = {}): JobFigures => ({
  created: 0,
  outcomes: { completed: 0, failed: 0, cancelled: 0, orphaned: 0 },
  p50Duration: null,
  p95Duration: null,
  p50Queue: null,
  p95Queue: null,
  runTime: 0,
  ...overrides,
});

const group = (id: string, now: Partial<JobFigures>, before?: Partial<JobFigures>): JobGroup => ({
  id,
  figures: figures(now),
  previous: before ? figures(before) : null,
});

const NAMES: Record<string, { name: string; project: string }> = {
  a: { name: 'e2e-tests', project: 'web' },
  b: { name: 'deploy-web', project: 'web' },
  c: { name: 'build-api', project: 'api' },
};
const nameOf = (id: string) => NAMES[id];

describe('rankingRows', () => {
  it('puts the slowest median first, with a bar against the first one', () => {
    const rows = rankingRows(
      [group('c', { p50Duration: 60 }), group('a', { p50Duration: 240 }, { p50Duration: 160 }), group('b', { p50Duration: null })],
      'slowest',
      nameOf,
    );
    expect(rows.map(row => [row.rank, row.name, row.value, row.bar])).toEqual([
      [1, 'e2e-tests', '4m 0s', 100],
      [2, 'build-api', '1m 0s', 25],
    ]);
    expect(rows[0].change).toMatchObject({ label: '+1m 20s', direction: 'up', tone: 'bad' });
    expect(rows[1].change).toBeNull();
  });

  it('counts the failed and orphaned jobs, and drops a pipeline with none', () => {
    const rows = rankingRows(
      [
        group('a', { outcomes: { completed: 9, failed: 1, cancelled: 4, orphaned: 0 } }, figures()),
        group('b', { outcomes: { completed: 0, failed: 2, cancelled: 0, orphaned: 2 } }, { outcomes: { completed: 0, failed: 6, cancelled: 0, orphaned: 0 } }),
        group('c', { outcomes: { completed: 3, failed: 0, cancelled: 1, orphaned: 0 } }),
      ],
      'failing',
      nameOf,
    );
    expect(rows.map(row => [row.name, row.value])).toEqual([
      ['deploy-web', '4'],
      ['e2e-tests', '1'],
    ]);
    expect(rows[0].change).toMatchObject({ label: '−2', tone: 'good' });
    expect(rows[1].change).toMatchObject({ label: '+1', tone: 'bad' });
  });

  it('orders a tie by name and names an unknown pipeline by the end of its id', () => {
    const rows = rankingRows(
      [group('pipeline-0000000z', { p50Duration: 30 }), group('b', { p50Duration: 30 })],
      'slowest',
      nameOf,
    );
    expect(rows.map(row => row.name)).toEqual(['0000000z', 'deploy-web']);
  });
});
