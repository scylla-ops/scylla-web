// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type {
  PipelineSummary,
  RecentRun,
} from '@base/features/pipeline/domain/structs/pipeline-summary.struct.ts';
import { projectCardMessages } from '../../messages/project-card.messages.ts';
import { cardPipelinesOf, liveFooterMessage } from '../project-card.presenter.ts';

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
  live: null,
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
        live: 'running',
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
      status: 'running',
      state: 'running',
      time: { kind: 'live', since: '2026-11-26T11:48:00.000Z' },
    });
    expect(cron.time).toEqual({ kind: 'next', at: '2026-11-27T03:00:00.000Z' });
    expect(done.time).toEqual({ kind: 'last', at: '2026-11-26T10:00:00.000Z' });
  });

  it('shows a job that waits as pending, never as running, with the state of the server', () => {
    const summaries = [
      summary({ id: 'waits', live: 'pending', recent: [run({ status: 'pending' })] }),
      summary({
        id: 'approval',
        live: 'awaiting_approval',
        recent: [run({ status: 'awaiting_approval' })],
      }),
      summary({
        id: 'both',
        live: 'running',
        recent: [
          run({ id: 'job-2', status: 'pending', createdAt: '2026-11-26T11:59:00.000Z' }),
          run({ status: 'running', startedAt: '2026-11-26T11:30:00.000Z' }),
        ],
      }),
    ];

    const [waits, approval, both] = cardPipelinesOf(summaries, 'web').rows;

    expect(waits).toMatchObject({
      status: 'pending',
      state: 'pending',
      time: { kind: 'live', since: '2026-11-26T10:00:00.000Z' },
    });
    expect(approval).toMatchObject({ status: 'awaiting_approval', state: 'pending' });
    expect(both).toMatchObject({
      status: 'running',
      state: 'running',
      time: { kind: 'live', since: '2026-11-26T11:30:00.000Z' },
    });
  });

  it('shows an orphaned last job as orphaned, never as running', () => {
    const [row] = cardPipelinesOf(
      [summary({ health: 'red', recent: [run({ status: 'orphaned' })] })],
      'web',
    ).rows;

    expect(row).toMatchObject({ status: 'orphaned', state: 'orphaned' });
  });

  it('puts the longest running job in the footer, else the longest wait, else the newest job, else the next cron', () => {
    const newest = summary({ id: 'n', recent: [run({ createdAt: '2026-11-26T11:00:00.000Z' })] });
    const older = summary({ id: 'o', recent: [run({ createdAt: '2026-11-25T11:00:00.000Z' })] });
    const waiting = (id: string, createdAt: string) =>
      summary({ id, live: 'pending', recent: [run({ status: 'pending', createdAt })] });
    const runs = summary({
      id: 'r',
      live: 'running',
      recent: [run({ status: 'running', startedAt: '2026-11-26T11:55:00.000Z' })],
    });
    const cron = summary({
      id: 'c',
      recent: [],
      nextFire: { at: '2026-11-27T03:00:00.000Z', schedule: '0 3 * * *' },
    });

    const waits = [
      waiting('w1', '2026-11-26T11:50:00.000Z'),
      waiting('w2', '2026-11-26T11:40:00.000Z'),
    ];
    expect(cardPipelinesOf([newest, ...waits], 'web').footer).toEqual({
      kind: 'live',
      status: 'pending',
      since: '2026-11-26T11:40:00.000Z',
    });
    expect(cardPipelinesOf([newest, ...waits, runs], 'web').footer).toEqual({
      kind: 'live',
      status: 'running',
      since: '2026-11-26T11:55:00.000Z',
    });
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

  it('tells the state of the live job in the footer text', () => {
    expect(liveFooterMessage('running')).toBe(projectCardMessages.jobRunningFor);
    expect(liveFooterMessage('pending')).toBe(projectCardMessages.jobPendingFor);
    expect(liveFooterMessage('awaiting_approval')).toBe(projectCardMessages.jobAwaitingApprovalFor);
  });
});
