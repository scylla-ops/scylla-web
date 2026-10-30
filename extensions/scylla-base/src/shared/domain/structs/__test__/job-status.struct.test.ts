// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { isActiveStatus, isFinishedStatus, type JobStatus } from '../job-status.struct.ts';

const ALL: JobStatus[] = [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
  'orphaned',
  'unknown',
];

describe('job status', () => {
  it('a pending or running job is active', () => {
    expect(ALL.filter(isActiveStatus)).toEqual(['pending', 'running']);
  });

  it('a job is finished once it has an outcome', () => {
    expect(ALL.filter(isFinishedStatus)).toEqual(['completed', 'failed', 'cancelled', 'orphaned']);
  });

  it('a status newer than this build is neither active nor finished', () => {
    expect(isActiveStatus('unknown')).toBe(false);
    expect(isFinishedStatus('unknown')).toBe(false);
  });
});
