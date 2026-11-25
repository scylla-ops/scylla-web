// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { JobEntity } from '@base/features/jobs/domain/entities/job.entity.ts';
import { jobNodeRows } from '../job-node-rows.presenter.ts';

const T0 = Date.parse('2026-01-01T00:00:00.000Z');
const at = (seconds: number) => new Date(T0 + seconds * 1000).toISOString();

const job = (overrides: Partial<JobEntity> = {}): JobEntity => ({
  id: 'job-1',
  pipelineId: 'pipeline-1',
  status: 'completed',
  nodes: [],
  nodeExecutions: [
    {
      id: 'build',
      state: 'completed',
      attempts: 1,
      maxAttempts: 1,
      ports: [],
      startedAt: at(0),
      finishedAt: at(30),
    },
    {
      id: 'test',
      state: 'completed',
      attempts: 1,
      maxAttempts: 1,
      ports: [],
      startedAt: at(30),
      finishedAt: at(100),
    },
    { id: 'deploy', state: 'skipped', attempts: 0, maxAttempts: 1, ports: [] },
  ],
  createdAt: at(0),
  updatedAt: at(100),
  startedAt: at(0),
  finishedAt: at(100),
  ...overrides,
});

describe('jobNodeRows', () => {
  it('places each node on the timeline of the job, with its duration in seconds', () => {
    const rows = jobNodeRows(job(), T0 + 500_000);

    expect(rows.map(row => [row.id, row.duration, row.bar])).toEqual([
      ['build', 30, { start: 0, width: 30 }],
      ['test', 70, { start: 30, width: 70 }],
      ['deploy', null, null],
    ]);
  });

  it('puts the checkout first, as a built-in step', () => {
    const rows = jobNodeRows(
      job({ checkout: { state: 'completed', startedAt: at(0), finishedAt: at(10) } }),
      T0,
    );

    expect(rows.map(row => [row.id, row.builtIn])).toEqual([
      ['.checkout', true],
      ['build', false],
      ['test', false],
      ['deploy', false],
    ]);
    expect(rows[0].bar).toEqual({ start: 0, width: 10 });
  });

  it('counts a running node, and the job, until now', () => {
    const rows = jobNodeRows(
      job({
        status: 'running',
        finishedAt: undefined,
        nodeExecutions: [
          {
            id: 'build',
            state: 'running',
            attempts: 1,
            maxAttempts: 1,
            ports: [],
            startedAt: at(50),
          },
        ],
      }),
      T0 + 100_000,
    );

    expect(rows[0].duration).toBe(50);
    expect(rows[0].bar).toEqual({ start: 50, width: 50 });
  });

  it('gives the whole bar to a node of a job with no length', () => {
    const rows = jobNodeRows(
      job({
        finishedAt: at(0),
        nodeExecutions: [
          {
            id: 'build',
            state: 'completed',
            attempts: 1,
            maxAttempts: 1,
            ports: [],
            startedAt: at(0),
            finishedAt: at(0),
          },
        ],
      }),
      T0,
    );

    expect(rows[0].bar).toEqual({ start: 0, width: 100 });
  });
});
