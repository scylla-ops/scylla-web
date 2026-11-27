// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { JobEntity } from '@base/features/jobs';
import type { PipelineSummary } from '@base/features/pipeline';
import {
  lastRunOf,
  liveRunOf,
  pipelineTone,
  stageChips,
  toneTextClass,
} from '../pipeline-widget.presenter.ts';

const summary = (overrides: Partial<PipelineSummary> = {}): PipelineSummary => ({
  id: 'p1',
  name: 'deploy-web',
  projectId: 'project-1',
  projectName: 'frontend',
  recent: [
    { id: 'job-00000running', status: 'running', branch: 'main', createdAt: '2026-11-20T09:00:00Z' },
    { id: 'job-0000000failed', status: 'failed', branch: 'main', createdAt: '2026-11-20T08:00:00Z', finishedAt: '2026-11-20T08:05:00Z' },
  ],
  completed: 17,
  failed: 3,
  medianDuration: 190,
  health: 'red',
  live: null,
  triggerKinds: ['push'],
  nextFire: null,
  ...overrides,
});

describe('the widget of one pipeline', () => {
  it('reads the newest run that ended', () => {
    expect(lastRunOf(summary())).toEqual({
      id: 'job-0000000failed',
      shortId: '00failed',
      status: 'failed',
      at: '2026-11-20T08:05:00Z',
      branch: 'main',
    });
    expect(lastRunOf(summary({ recent: [] }))).toBeNull();
  });

  it('shows a pipeline in the state of its jobs that run or wait, else the end of its last run', () => {
    expect(pipelineTone(summary())).toBe('failed');
    expect(pipelineTone(summary({ live: 'running' }))).toBe('running');
    expect(pipelineTone(summary({ live: 'pending' }))).toBe('queued');
    expect(pipelineTone(summary({ live: 'awaiting_approval' }))).toBe('queued');
    expect(pipelineTone(summary({ recent: [] }))).toBe('muted');
  });

  it('tells the job that runs or waits now, not the last run that ended', () => {
    expect(liveRunOf(summary({ live: 'running' }))).toEqual({
      id: 'job-00000running',
      shortId: '0running',
      status: 'running',
      at: '2026-11-20T09:00:00Z',
      branch: 'main',
    });
    expect(liveRunOf(summary())).toBeNull();
    expect(liveRunOf(summary({ live: 'pending' }))).toBeNull();
  });

  it('colors the icon of a pipeline in its tone', () => {
    expect(toneTextClass('running')).toBe('text-status-running');
    expect(toneTextClass('queued')).toBe('text-status-queued');
    expect(toneTextClass('failed')).toBe('text-status-failed');
    expect(toneTextClass('muted')).toBe('text-muted-foreground');
  });

  it('gives a chip for each node of the job, in its order', () => {
    const job = {
      nodeExecutions: [
        { id: 'build', state: 'completed', attempts: 1, maxAttempts: 1 },
        { id: 'push-image', state: 'failed', attempts: 2, maxAttempts: 3 },
        { id: 'deploy', state: 'skipped', attempts: 0, maxAttempts: 1 },
      ],
    } as unknown as JobEntity;
    expect(stageChips(job)).toEqual([
      { id: 'build', tone: 'passed' },
      { id: 'push-image', tone: 'failed' },
      { id: 'deploy', tone: 'skipped' },
    ]);
    expect(stageChips(undefined)).toEqual([]);
  });
});
