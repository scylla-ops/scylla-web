import { describe, it, expect } from 'vitest';
import {
  JOB_FILTER_STATUSES,
  jobDuration,
  jobFilterChoices,
  jobStatusLabel,
} from '../agent-jobs.presenter.ts';

describe('jobFilterChoices', () => {
  it('counts the ended jobs of each state, and the running jobs as active', () => {
    const choices = jobFilterChoices({ completed: 40, failed: 3, cancelled: 2, orphaned: 1 }, 2);

    expect(choices.map(choice => [choice.label, choice.count])).toEqual([
      ['All', 48],
      ['Active', 2],
      ['Passed', 40],
      ['Failed', 4],
      ['Cancelled', 2],
    ]);
  });

  it('gives no count without the stats', () => {
    expect(jobFilterChoices(undefined, 2).every(choice => choice.count === undefined)).toBe(true);
  });

  it('asks the server for an orphaned job with the failed jobs, and for a job to approve with the active ones', () => {
    expect(JOB_FILTER_STATUSES.failed).toEqual(['failed', 'orphaned']);
    expect(JOB_FILTER_STATUSES.active).toContain('awaiting_approval');
    expect(JOB_FILTER_STATUSES.all).toEqual([]);
  });
});

describe('a job of the list', () => {
  it('gives the time from the start to the end of an ended job only', () => {
    expect(
      jobDuration({ startedAt: '2026-11-04T14:00:00Z', finishedAt: '2026-11-04T14:03:12Z' }),
    ).toBe('3m 12s');
    expect(jobDuration({ startedAt: '2026-11-04T14:00:00Z' })).toBeNull();
  });

  it('names each state', () => {
    expect(jobStatusLabel('orphaned')).toBe('Orphaned');
    expect(jobStatusLabel('completed')).toBe('Passed');
  });
});
