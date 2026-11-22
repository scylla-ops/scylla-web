import { describe, it, expect } from 'vitest';
import type { JobEntity } from '@base/features/jobs';
import {
  MAX_BARS,
  barCapacity,
  barHeight,
  historyBars,
  historyFigures,
  historyStats,
  jobDuration,
  shortId,
} from '../pipeline-history.presenter.ts';

const START = Date.parse('2026-11-14T10:00:00Z');
const at = (seconds: number) => new Date(START + seconds * 1000).toISOString();

/** A job that started at START and ran `seconds`. */
const job = (id: string, status: JobEntity['status'], seconds?: number): JobEntity => ({
  id,
  pipelineId: 'pipeline-1',
  status,
  nodes: [],
  nodeExecutions: [],
  createdAt: at(0),
  updatedAt: at(seconds ?? 0),
  startedAt: status === 'pending' ? undefined : at(0),
  finishedAt: seconds === undefined ? undefined : at(seconds),
});

describe('barCapacity', () => {
  it('fits bars of 20 px, 4 px apart, in the width of the column, at most 30', () => {
    expect(barCapacity(596)).toBe(25);
    expect(barCapacity(595)).toBe(24);
    expect(barCapacity(20)).toBe(1);
    expect(barCapacity(10)).toBe(0);
    expect(barCapacity(5000)).toBe(MAX_BARS);
  });
});

describe('barHeight', () => {
  it('gives 40 px to the median duration, and keeps each bar from 8 to 48 px', () => {
    expect(barHeight(60, 60)).toBe(40);
    expect(barHeight(30, 60)).toBe(20);
    expect(barHeight(600, 60)).toBe(48);
    expect(barHeight(1, 60)).toBe(8);
  });

  it('gives the smallest bar to a job that did not start, and 40 px when nothing gives a median', () => {
    expect(barHeight(null, 60)).toBe(8);
    expect(barHeight(30, null)).toBe(40);
  });
});

describe('jobDuration', () => {
  it('counts to now while the job runs, and to its end after', () => {
    expect(jobDuration(job('a', 'running'), START + 84_000)).toBe(84);
    expect(jobDuration(job('a', 'completed', 52), START + 84_000)).toBe(52);
    expect(jobDuration(job('a', 'pending'), START + 84_000)).toBeNull();
  });
});

describe('historyBars', () => {
  const jobs = [
    job('newest-running', 'running'),
    job('failed-01', 'failed', 30),
    job('passed-02', 'completed', 60),
    job('passed-03', 'completed', 60),
    job('oldest-cancelled', 'cancelled', 120),
  ];

  it('shows the newest jobs that the row holds, the oldest on the left', () => {
    expect(historyBars(jobs, 3, START).map(bar => bar.job.id)).toEqual([
      'passed-02',
      'failed-01',
      'newest-running',
    ]);
  });

  it('gives each bar the solid color of its status, and makes a running bar breathe', () => {
    const [cancelled, , , failed, running] = historyBars(jobs, 5, START + 30_000);

    expect(cancelled.className).toBe('bg-status-canceled');
    expect(failed.className).toBe('bg-status-failed');
    expect(running.className).toContain('bg-status-running');
    expect(running.className).toContain('animate-[smooth-pulse_2s_infinite]');
  });

  it('grows the bar of a running job with its live duration', () => {
    const early = historyBars(jobs, 5, START + 30_000).at(-1);
    const late = historyBars(jobs, 5, START + 60_000).at(-1);

    expect(early?.height).toBe(20);
    expect(late?.height).toBe(40);
  });
});

describe('historyStats', () => {
  const jobs = [
    job('running-0', 'running'),
    job('failed-01', 'failed', 30),
    job('passed-02', 'completed', 60),
    job('passed-03', 'completed', 100),
    job('cancel-04', 'cancelled', 5),
    job('orphan-05', 'orphaned', 5),
    job('passed-06', 'completed', 20),
  ];

  it('counts the jobs of the bars only', () => {
    const stats = historyStats(jobs, 4, START);

    expect(stats.count).toBe(4);
    expect(stats.failures).toBe(1);
    expect(stats.passRate).toBe(2 / 3);
    expect(stats.medianDuration).toBe(80);
    expect(stats.lastFailure?.id).toBe('failed-01');
  });

  it('counts an orphaned job as a failure, and leaves a cancelled job out of the rate', () => {
    const stats = historyStats(jobs, 7, START);

    expect(stats.failures).toBe(2);
    expect(stats.passRate).toBe(3 / 5);
    expect(stats.medianDuration).toBe(60);
  });

  it('gives no rate and no median with no ended job', () => {
    const stats = historyStats([job('running-0', 'running')], 30, START);

    expect(stats.passRate).toBeNull();
    expect(stats.medianDuration).toBeNull();
    expect(stats.lastFailure).toBeNull();
    expect(historyFigures(stats).map(figure => figure.value)).toEqual(['-', '-', '0']);
  });

  it('writes the rate in percent and the median as a duration', () => {
    expect(historyFigures(historyStats(jobs, 4, START))).toEqual([
      { label: 'passed', value: '67%' },
      { label: 'median', value: '1m 20s' },
      { label: 'failed', value: '1' },
    ]);
  });
});

describe('shortId', () => {
  it('keeps the last 8 characters, which differ between two ids made at the same time', () => {
    expect(shortId('01a1da10-de70-7482-bf3c-5e1d2a9c0f41')).toBe('2a9c0f41');
  });
});
