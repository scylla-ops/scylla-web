// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { JobEntity } from '@base/features/jobs';
import type { PipelineSummary } from '@base/features/pipeline';
import { lastRunOf, pipelineTone, stageChips } from '../pipeline-widget.presenter.ts';

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
  active: false,
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

  it('shows a pipeline that runs as running, else the end of its last run', () => {
    expect(pipelineTone(summary())).toBe('failed');
    expect(pipelineTone(summary({ active: true }))).toBe('running');
    expect(pipelineTone(summary({ recent: [] }))).toBe('muted');
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
