// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { PipelineStep } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
import { jobRows } from './job-list.calculator.ts';

const script = (id: string, deps: string[] = [], body = 'make'): PipelineStep => ({
  id,
  deps,
  kind: 'script',
  shell: 'sh',
  script: body,
  env: [],
});

describe('jobRows', () => {
  it('lists the jobs in the order they run, then in the order of the document', () => {
    const rows = jobRows([script('test', ['build']), script('lint'), script('build')]);
    expect(rows.map(row => [row.step.id, row.depth])).toEqual([
      ['lint', 0],
      ['build', 0],
      ['test', 1],
    ]);
  });

  it('marks a job that cannot run, or whose id the server refuses', () => {
    const rows = jobRows([script('empty', [], ''), script('Bad Id'), script('ok')]);
    expect(rows.map(row => row.hasIssue)).toEqual([true, true, false]);
  });
});
