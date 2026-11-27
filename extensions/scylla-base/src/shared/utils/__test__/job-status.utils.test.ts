// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { JobStatus } from '@shared/domain/structs/job-status.struct.ts';
import { toStatusState } from '../job-status.utils';

describe('toStatusState', () => {
  it.each([
    ['pending', 'pending'],
    ['awaiting_approval', 'pending'],
    ['running', 'running'],
    ['completed', 'success'],
    ['failed', 'failed'],
    ['cancelled', 'cancelled'],
    ['orphaned', 'orphaned'],
    ['unknown', 'idle'],
  ] as const satisfies readonly (readonly [JobStatus, string])[])(
    'gives each job status its own shape: %s is %s',
    (raw, expected) => {
      expect(toStatusState(raw)).toBe(expected);
    },
  );

  it('never draws a job that waits as running, and never a running job as orphaned', () => {
    expect(toStatusState('pending')).not.toBe('running');
    expect(toStatusState('awaiting_approval')).not.toBe('running');
    expect(toStatusState('running')).not.toBe('orphaned');
    expect(toStatusState('orphaned')).not.toBe('running');
  });

  it.each([
    ['success', 'success'],
    ['skipped', 'skipped'],
  ] as const)('maps the node status %s to %s', (raw, expected) => {
    expect(toStatusState(raw)).toBe(expected);
  });

  it('is case-insensitive (API casing should never break the mapping)', () => {
    expect(toStatusState('RUNNING')).toBe('running');
    expect(toStatusState('Failed')).toBe('failed');
  });

  it('falls back to idle for an unknown status', () => {
    expect(toStatusState('some-future-status')).toBe('idle');
  });

  it('falls back to idle when status is undefined', () => {
    expect(toStatusState(undefined)).toBe('idle');
  });
});
