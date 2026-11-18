// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { AppEntity } from '@base/features/apps';
import type { JobEntity } from '@base/features/jobs';
import {
  capacityOf,
  countChange,
  outcomeShares,
  timelineTicks,
} from '../view-figures.presenter.ts';

const agent = (overrides: Partial<AppEntity>): AppEntity =>
  ({
    id: 'agent',
    name: 'runner',
    runner: true,
    connected: true,
    runningJobs: 0,
    disabledAt: '',
    host: { capacity: 2 },
    ...overrides,
  }) as AppEntity;

const job = (overrides: Partial<JobEntity>): JobEntity =>
  ({ id: 'job', pipelineId: 'p', status: 'completed', createdAt: '', updatedAt: '', nodeExecutions: [], ...overrides });

describe('view figures', () => {
  it('counts the slots of the connected agents, and marks the slots of the others offline', () => {
    const capacity = capacityOf([
      agent({ id: 'a', runningJobs: 1 }),
      agent({ id: 'b', name: 'runner-us-1', connected: false }),
      agent({ id: 'c', disabledAt: '2026-01-01T00:00:00Z' }),
    ]);

    expect(capacity).toMatchObject({ online: 1, total: 2, busy: 1, slots: 2, offline: 'runner-us-1' });
    expect(capacity.states).toEqual(['busy', 'free', 'offline', 'offline']);
  });

  it('splits the bar of a ratio over the decided jobs only', () => {
    expect(outcomeShares({ completed: 3, failed: 1, orphaned: 0, cancelled: 5 })).toEqual({
      completed: 75,
      failed: 25,
      orphaned: 0,
    });
  });

  it('places the ended jobs of the last 24 hours, the oldest at the left', () => {
    const now = Date.parse('2026-01-02T00:00:00Z');
    const ticks = timelineTicks(
      [
        job({ id: 'late', status: 'failed', createdAt: '2026-01-01T18:00:00Z', finishedAt: 'x' }),
        job({ id: 'early', createdAt: '2026-01-01T06:00:00Z', finishedAt: 'x' }),
        job({ id: 'running', status: 'running', createdAt: '2026-01-01T23:00:00Z' }),
      ],
      now,
    );

    expect(ticks.map(tick => [tick.id, tick.left, tick.tone])).toEqual([
      ['early', 25, 'passed'],
      ['late', 75, 'failed'],
    ]);
  });

  it('gives the change of a count, or nothing with no previous period', () => {
    expect(countChange(164, 152)).toMatchObject({ label: '+12 vs previous', direction: 'up' });
    expect(countChange(3, null)).toBeNull();
  });
});
