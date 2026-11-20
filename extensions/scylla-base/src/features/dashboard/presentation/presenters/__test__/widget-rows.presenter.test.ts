import { describe, it, expect } from 'vitest';
import { formatUtcDay } from '@shared/utils/date-utils.ts';
import type { JobEntity } from '@base/features/jobs';
import type { PipelineSummary } from '@base/features/pipeline';
import {
  activityRows,
  attentionCounts,
  attentionItems,
  liveJobs,
  pipelineRows,
  pipelinesById,
  whenText,
} from '../widget-rows.presenter.ts';

const NOW = Date.parse('2026-11-17T10:00:00Z');

const summary = (overrides: Partial<PipelineSummary> = {}): PipelineSummary => ({
  id: 'pipeline-1',
  name: 'build-api',
  projectId: 'project-1',
  projectName: 'backend',
  recent: [],
  completed: 0,
  failed: 0,
  medianDuration: null,
  health: 'none',
  active: false,
  triggerKinds: [],
  nextFire: null,
  ...overrides,
});

const job = (overrides: Partial<JobEntity> = {}): JobEntity => ({
  id: 'job-00000001',
  pipelineId: 'pipeline-1',
  status: 'running',
  nodes: [],
  nodeExecutions: [],
  createdAt: '2026-11-17T09:58:00Z',
  updatedAt: '2026-11-17T09:58:00Z',
  ...overrides,
});

describe('liveJobs', () => {
  it('gives the time of a running job against the median of its pipeline', () => {
    const pipelines = pipelinesById([summary({ medianDuration: 112 })]);
    const { running } = liveJobs(
      [job({ startedAt: '2026-11-17T09:59:19Z' })],
      pipelines,
      NOW,
    );

    expect(running).toEqual([
      expect.objectContaining({
        pipelineName: 'build-api',
        projectName: 'backend',
        shortId: '00000001',
        elapsed: '41s',
        expected: '1m 52s',
        overrun: null,
      }),
    ]);
    expect(running[0].progress).toBeCloseTo(41 / 112);
  });

  it('says how many times the median a long job runs, and fills its bar', () => {
    const pipelines = pipelinesById([summary({ medianDuration: 126 })]);
    const { running } = liveJobs([job({ startedAt: '2026-11-17T09:55:48Z' })], pipelines, NOW);

    expect(running[0]).toMatchObject({ progress: 1, overrun: '2× the median' });
  });

  it('draws no bar for a pipeline with no median yet', () => {
    const { running } = liveJobs([job()], pipelinesById([summary()]), NOW);

    expect(running[0]).toMatchObject({ expected: null, progress: null, overrun: null });
  });

  it('gives the jobs that wait, the longest wait first, with the reason', () => {
    const { waiting } = liveJobs(
      [
        job({ id: 'a', status: 'pending', createdAt: '2026-11-17T09:57:51Z' }),
        job({ id: 'b', status: 'awaiting_approval', createdAt: '2026-11-17T09:48:00Z' }),
      ],
      pipelinesById([summary()]),
      NOW,
    );

    expect(waiting.map(row => [row.jobId, row.reason, row.waited])).toEqual([
      ['b', 'approval', '12m 0s'],
      ['a', 'agent', '2m 9s'],
    ]);
  });

  it('shows the short id of a pipeline that the summaries do not hold', () => {
    const { running } = liveJobs([job({ pipelineId: 'pipeline-abcdef12' })], new Map(), NOW);

    expect(running[0].pipelineName).toBe('abcdef12');
  });
});

describe('attentionItems', () => {
  const run = (id: string, status: JobEntity['status'], finishedAt?: string) => ({
    id,
    status,
    branch: 'main',
    createdAt: '2026-11-17T08:00:00Z',
    ...(finishedAt && { finishedAt }),
  });

  it('lists each red pipeline by its last ended job, and each job that waits for an approval', () => {
    const items = attentionItems(
      [
        summary({
          id: 'p-red',
          name: 'deploy-web',
          health: 'red',
          recent: [run('j-running', 'running'), run('j-failed', 'failed', '2026-11-17T09:42:00Z')],
        }),
        summary({
          id: 'p-orphaned',
          name: 'release-agent',
          health: 'red',
          recent: [run('j-orphaned', 'orphaned', '2026-11-17T08:00:00Z')],
        }),
        summary({ id: 'p-green', health: 'green', recent: [run('j-ok', 'completed', '2026-11-17T09:00:00Z')] }),
      ],
      [job({ id: 'j-approval', pipelineId: 'p-green', status: 'awaiting_approval', createdAt: '2026-11-17T09:50:00Z' })],
    );

    expect(items.map(item => [item.kind, item.jobId, item.pipelineName])).toEqual([
      ['approval', 'j-approval', 'build-api'],
      ['failed', 'j-failed', 'deploy-web'],
      ['orphaned', 'j-orphaned', 'release-agent'],
    ]);
    expect(attentionCounts(items)).toEqual([
      { kind: 'failed', count: 1 },
      { kind: 'orphaned', count: 1 },
      { kind: 'approval', count: 1 },
    ]);
  });

  it('leaves out a red pipeline whose last ended job was cancelled', () => {
    expect(
      attentionItems(
        [summary({ health: 'red', recent: [run('j', 'cancelled', '2026-11-17T09:00:00Z')] })],
        [],
      ),
    ).toEqual([]);
  });

  it('is empty when all is clear', () => {
    expect(attentionItems([summary({ health: 'green' })], [job()])).toEqual([]);
    expect(attentionCounts([])).toEqual([]);
  });
});

describe('whenText', () => {
  const now = new Date(NOW);

  it('gives the time of the zone for an instant of today', () => {
    expect(whenText('2026-11-17T08:02:00Z', now, 'Europe/Paris')).toBe('09:02');
  });

  it('gives the day for an instant of another day of the zone', () => {
    expect(whenText('2026-11-16T22:30:00Z', now, 'UTC')).toBe(formatUtcDay('2026-11-16'));
    expect(whenText('2026-11-16T23:30:00Z', now, 'Europe/Paris')).toBe('00:30');
  });
});

describe('activityRows', () => {
  it('lists the ended jobs only, with their color and time', () => {
    const rows = activityRows(
      [
        job({ id: 'a', status: 'failed', finishedAt: '2026-11-17T09:30:00Z' }),
        job({ id: 'b', status: 'running' }),
        job({ id: 'c', status: 'completed', finishedAt: '2026-11-17T09:00:00Z' }),
      ],
      pipelinesById([summary()]),
      new Date(NOW),
      'UTC',
    );

    expect(rows.map(row => [row.jobId, row.status, row.tone, row.when])).toEqual([
      ['a', 'failed', 'failed', '09:30'],
      ['c', 'completed', 'passed', '09:00'],
    ]);
  });
});

describe('pipelineRows', () => {
  it('shows the health, the last runs with the newest at the right, the rate and the median', () => {
    const [row] = pipelineRows(
      [
        summary({
          health: 'red',
          completed: 17,
          failed: 3,
          medianDuration: 525,
          triggerKinds: ['push', 'cron'],
          recent: [
            { id: '3', status: 'failed', branch: '', createdAt: '' },
            { id: '2', status: 'completed', branch: '', createdAt: '' },
            { id: '1', status: 'orphaned', branch: '', createdAt: '' },
          ],
        }),
      ],
      2,
    );

    expect(row).toMatchObject({
      tone: 'failed',
      trigger: 'push',
      strip: ['passed', 'failed'],
      rate: '85%',
      median: '8m 45s',
    });
  });

  it('gives each run of the strip its short id, status, branch, duration and time for the tooltip', () => {
    const [row] = pipelineRows(
      [
        summary({
          recent: [
            {
              id: 'job-0000abcdef12',
              status: 'failed',
              branch: 'main',
              createdAt: '2026-11-17T09:00:00Z',
              startedAt: '2026-11-17T09:00:00Z',
              finishedAt: '2026-11-17T09:01:30Z',
            },
            { id: 'job-00001234abcd', status: 'running', branch: '', createdAt: '2026-11-16T09:00:00Z' },
          ],
        }),
      ],
      20,
      'UTC',
      new Date('2026-11-17T12:00:00Z'),
    );

    expect(row.runs).toHaveLength(2);
    expect(row.runs[1]).toMatchObject({
      shortId: 'abcdef12',
      status: 'failed',
      tone: 'failed',
      branch: 'main',
      duration: '1m 30s',
      when: '09:00',
    });
    expect(row.runs[0]).toMatchObject({ shortId: '1234abcd', duration: '—' });
  });

  it('shows a pipeline that runs now in the color of a running job, and a pipeline with no trigger as manual', () => {
    const [row] = pipelineRows([summary({ active: true, health: 'green' })], 20);

    expect(row).toMatchObject({ tone: 'running', trigger: 'manual', rate: '—', median: '—' });
  });
});
