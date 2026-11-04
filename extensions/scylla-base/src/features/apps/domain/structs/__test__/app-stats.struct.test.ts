// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { AppJob } from '../../entities/app.entity.ts';
import { appStatsOf } from '../app-stats.struct.ts';

const job = (status: AppJob['status'], startedAt?: string, seconds?: number): AppJob => ({
  id: `${status}-${startedAt}`,
  pipelineId: 'p',
  projectId: 'pr',
  status,
  createdAt: startedAt ?? '2026-01-01T00:00:00.000Z',
  ...(startedAt && { startedAt }),
  ...(startedAt &&
    seconds !== undefined && {
      finishedAt: new Date(Date.parse(startedAt) + seconds * 1000).toISOString(),
    }),
});

describe('appStatsOf', () => {
  it('counts the jobs by status and finds the last start', () => {
    const stats = appStatsOf([
      job('completed', '2026-01-01T10:00:00.000Z', 10),
      job('failed', '2026-01-02T10:00:00.000Z', 30),
      job('running', '2026-01-03T10:00:00.000Z'),
      job('pending'),
    ]);

    expect(stats).toMatchObject({ total: 4, completed: 1, failed: 1, running: 1 });
    expect(stats.lastRunAt).toBe('2026-01-03T10:00:00.000Z');
  });

  it('gives the median and the p95 of the finished jobs only', () => {
    const stats = appStatsOf(
      [10, 20, 30, 40].map((seconds, index) =>
        job('completed', `2026-01-0${index + 1}T10:00:00.000Z`, seconds),
      ),
    );

    expect(stats.medianDurationMs).toBe(20_000);
    expect(stats.p95DurationMs).toBe(40_000);
  });

  it('gives no duration before a job finished', () => {
    expect(appStatsOf([job('pending')])).toMatchObject({
      medianDurationMs: null,
      p95DurationMs: null,
      lastRunAt: '',
    });
  });
});
