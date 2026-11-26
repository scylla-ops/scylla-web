// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type {
  PipelineSummary,
  RecentRun,
} from '@base/features/pipeline/domain/structs/pipeline-summary.struct.ts';
import { cardPipelinesOf } from '../project-card.presenter.ts';

const run = (patch: Partial<RecentRun> = {}): RecentRun => ({
  id: 'job-1',
  status: 'completed',
  branch: 'main',
  createdAt: '2026-11-26T10:00:00.000Z',
  ...patch,
});

const summary = (patch: Partial<PipelineSummary> = {}): PipelineSummary => ({
  id: 'pipe-1',
  name: 'CI',
  projectId: 'web',
  projectName: 'web',
  recent: [run()],
  completed: 1,
  failed: 0,
  medianDuration: 60,
  health: 'green',
  active: false,
  triggerKinds: [],
  nextFire: null,
  ...patch,
});

describe('cardPipelinesOf', () => {
  it('keeps the pipelines of the project, the first three as rows, and counts the others', () => {
    const summaries = [
      summary({ id: 'a', health: 'red', recent: [run({ status: 'failed' })] }),
      summary({ id: 'other', projectId: 'api' }),
      summary({ id: 'b' }),
      summary({ id: 'c', recent: [] }),
      summary({ id: 'd' }),
      summary({ id: 'e', health: 'red' }),
    ];

    const card = cardPipelinesOf(summaries, 'web');

    expect(card.rows.map(row => row.id)).toEqual(['a', 'b', 'c']);
    expect(card.more).toBe(2);
    expect(card.failing).toBe(2);
    expect(card.rows[0]).toMatchObject({ status: 'failed', state: 'failed', branch: 'main' });
    expect(card.rows[2]).toMatchObject({ status: null, state: 'idle', branch: '', time: null });
  });

  it('gives the time of a row: since when its job runs, then its next cron, then its last job', () => {
    const summaries = [
      summary({
        id: 'running',
        active: true,
        recent: [run({ status: 'running', startedAt: '2026-11-26T11:48:00.000Z' })],
      }),
      summary({
        id: 'cron',
        nextFire: { at: '2026-11-27T03:00:00.000Z', schedule: '0 3 * * *' },
      }),
      summary({ id: 'done' }),
    ];

    const [running, cron, done] = cardPipelinesOf(summaries, 'web').rows;

    expect(running).toMatchObject({
      state: 'running',
      time: { kind: 'running', since: '2026-11-26T11:48:00.000Z' },
    });
    expect(cron.time).toEqual({ kind: 'next', at: '2026-11-27T03:00:00.000Z' });
    expect(done.time).toEqual({ kind: 'last', at: '2026-11-26T10:00:00.000Z' });
  });

  it('puts the longest running job in the footer, else the newest job, else the next cron', () => {
    const newest = summary({ id: 'n', recent: [run({ createdAt: '2026-11-26T11:00:00.000Z' })] });
    const older = summary({ id: 'o', recent: [run({ createdAt: '2026-11-25T11:00:00.000Z' })] });
    const busy = (id: string, createdAt: string) =>
      summary({ id, active: true, recent: [run({ status: 'pending', createdAt })] });
    const cron = summary({
      id: 'c',
      recent: [],
      nextFire: { at: '2026-11-27T03:00:00.000Z', schedule: '0 3 * * *' },
    });

    expect(
      cardPipelinesOf(
        [newest, busy('b1', '2026-11-26T11:50:00.000Z'), busy('b2', '2026-11-26T11:40:00.000Z')],
        'web',
      ).footer,
    ).toEqual({ kind: 'running', since: '2026-11-26T11:40:00.000Z' });
    expect(cardPipelinesOf([older, newest, cron], 'web').footer).toEqual({
      kind: 'last',
      at: '2026-11-26T11:00:00.000Z',
    });
    expect(cardPipelinesOf([cron], 'web').footer).toEqual({
      kind: 'next',
      at: '2026-11-27T03:00:00.000Z',
    });
    expect(cardPipelinesOf([summary({ recent: [] })], 'web').footer).toEqual({ kind: 'none' });
    expect(cardPipelinesOf([], 'web')).toEqual({ rows: [], more: 0, failing: 0, footer: null });
  });
});
