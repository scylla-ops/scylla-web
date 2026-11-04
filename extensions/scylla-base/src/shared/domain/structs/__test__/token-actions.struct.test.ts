// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  ACTION_GROUPS,
  expiryDateOf,
  keysOf,
  limitsOf,
  methodsOf,
  presetKeys,
} from '../token-actions.struct.ts';

describe('token actions', () => {
  it('checks the reads and the logs for read-only, and adds run and cancel for deploy', () => {
    const readOnly = presetKeys('read_only');
    expect(readOnly).toContain('projects.read');
    expect(readOnly).toContain('jobs.logs');
    expect(readOnly).not.toContain('pipelines.run');
    expect(presetKeys('deploy')).toEqual([...readOnly, 'pipelines.run', 'jobs.cancel']);
    expect(presetKeys('full')).toHaveLength(
      ACTION_GROUPS.reduce((sum, group) => sum + group.actions.length, 0),
    );
  });

  it('gives the methods of the checked boxes and finds the boxes back', () => {
    const methods = methodsOf(['pipelines.run', 'jobs.cancel']);
    expect(methods).toEqual([
      'scylla.pipelines.v1.PipelineService/RunPipeline',
      'scylla.pipelines.v1.JobService/CancelJob',
      'scylla.pipelines.v1.JobService/RerunJob',
    ]);
    expect(keysOf(methods)).toEqual(['pipelines.run', 'jobs.cancel']);
    expect(keysOf(['scylla.pipelines.v1.JobService/CancelJob'])).toEqual([]);
  });

  it('sends the methods only for custom limits', () => {
    expect(limitsOf('deploy', ['pipelines.run'], ['p-1'])).toEqual({
      preset: 'deploy',
      actions: [],
      projectIds: ['p-1'],
    });
    expect(limitsOf('custom', ['pipelines.run'], []).actions).toEqual([
      'scylla.pipelines.v1.PipelineService/RunPipeline',
    ]);
  });

  it('gives the end of a token from its life in days', () => {
    expect(expiryDateOf(90, new Date('2026-11-04T00:00:00.000Z')).toISOString()).toBe(
      '2027-02-02T00:00:00.000Z',
    );
  });
});
