// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { JobStatus } from '@base/generated/scylla/pipelines/v1/job.ts';
import { TriggerKind } from '@base/generated/scylla/pipelines/v1/trigger.ts';
import { PipelineSource } from '@base/generated/scylla/integrations/v1/vcs.ts';
import type { PipelineSummary } from '@base/generated/scylla/pipelines/v1/pipeline_summary.ts';
import { healthOf, listToDomain } from '../grpc-pipeline-summary.mapper.ts';

const summary = (overrides: Partial<PipelineSummary> = {}): PipelineSummary => ({
  pipelineId: { value: 'pipeline-1' },
  name: 'deploy-web',
  projectId: { value: 'project-1' },
  projectName: 'frontend',
  recent: [
    {
      id: { value: 'job-2' },
      status: JobStatus.FAILED,
      branch: 'main',
      createdAt: { seconds: 1763380800n, nanos: 0 },
      startedAt: { seconds: 1763380810n, nanos: 0 },
      finishedAt: { seconds: 1763381000n, nanos: 0 },
    },
    { id: { value: 'job-1' }, status: 99 as JobStatus, branch: '', createdAt: { seconds: 1763377200n, nanos: 0 } },
  ],
  completed: 17,
  failed: 3,
  medianDuration: { seconds: 190n, nanos: 0 },
  lastEndedStatus: JobStatus.FAILED,
  active: false,
  liveStatus: JobStatus.UNSPECIFIED,
  triggerKinds: [TriggerKind.PUSH, 99 as TriggerKind],
  source: PipelineSource.EDITOR,
  keyTaken: false,
  ...overrides,
});

describe('listToDomain', () => {
  it('maps a summary, its last jobs and the counts of all the pages', () => {
    const list = listToDomain({ pipelines: [summary()], total: 12, green: 9 });

    expect(list.total).toBe(12);
    expect(list.green).toBe(9);
    expect(list.items[0]).toEqual({
      id: 'pipeline-1',
      name: 'deploy-web',
      projectId: 'project-1',
      projectName: 'frontend',
      recent: [
        {
          id: 'job-2',
          status: 'failed',
          branch: 'main',
          createdAt: '2025-11-17T12:00:00.000Z',
          startedAt: '2025-11-17T12:00:10.000Z',
          finishedAt: '2025-11-17T12:03:20.000Z',
        },
        {
          id: 'job-1',
          status: 'unknown',
          branch: '',
          createdAt: '2025-11-17T11:00:00.000Z',
          startedAt: undefined,
          finishedAt: undefined,
        },
      ],
      completed: 17,
      failed: 3,
      medianDuration: 190,
      health: 'red',
      live: null,
      triggerKinds: ['push'],
      nextFire: null,
    });
  });

  it('gives no median when no recent job completed', () => {
    const list = listToDomain({
      pipelines: [summary({ medianDuration: undefined })],
      total: 1,
      green: 0,
    });

    expect(list.items[0].medianDuration).toBeNull();
  });

  it.each([
    [JobStatus.RUNNING, 'running'],
    [JobStatus.PENDING, 'pending'],
    [JobStatus.AWAITING_APPROVAL, 'awaiting_approval'],
    [JobStatus.UNSPECIFIED, null],
  ] as const)('keeps the live state of the server: %s → %s', (liveStatus, live) => {
    const list = listToDomain({ pipelines: [summary({ liveStatus })], total: 1, green: 0 });

    expect(list.items[0].live).toBe(live);
  });

  it('reads the live state from live_status, not from the deprecated active of the old clients', () => {
    const list = listToDomain({
      pipelines: [summary({ active: true, liveStatus: JobStatus.PENDING })],
      total: 1,
      green: 0,
    });

    expect(list.items[0].live).toBe('pending');
  });
});

describe('healthOf', () => {
  it.each([
    [JobStatus.COMPLETED, 'green'],
    [JobStatus.FAILED, 'red'],
    [JobStatus.ORPHANED, 'red'],
    [JobStatus.CANCELLED, 'red'],
    [JobStatus.UNSPECIFIED, 'none'],
  ] as const)('gives %s → %s', (status, health) => {
    expect(healthOf(status)).toBe(health);
  });
});
