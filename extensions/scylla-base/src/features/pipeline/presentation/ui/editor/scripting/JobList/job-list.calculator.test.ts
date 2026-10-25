// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { PipelineStep } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
import {
  depsAfterDrop,
  jobRelations,
  jobRows,
  jobStages,
  stepsAfterDrop,
} from './job-list.calculator.ts';

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

describe('jobStages', () => {
  it('groups the jobs that can run together, on the longest path', () => {
    const steps = [
      script('build'),
      script('lint'),
      script('test', ['build']),
      script('deploy', ['lint', 'test']),
    ];
    expect(jobStages(jobRows(steps)).map(stage => stage.map(row => row.step.id))).toEqual([
      ['build', 'lint'],
      ['test'],
      ['deploy'],
    ]);
  });
});

describe('jobRelations', () => {
  const steps = [
    script('build'),
    script('lint'),
    script('test', ['build', 'lint']),
    script('e2e', ['test']),
  ];

  it('names the jobs the focused one waits for, and the ones that wait for it', () => {
    expect(Object.fromEntries(jobRelations(steps, 'test'))).toEqual({
      build: 'dependency',
      lint: 'dependency',
      e2e: 'dependent',
    });
  });

  it('relates nothing without a focused job', () => {
    expect(jobRelations(steps, null).size).toBe(0);
  });
});

describe('depsAfterDrop', () => {
  it('makes the job wait for the job it is dropped on, and for no other', () => {
    expect(depsAfterDrop(['build', 'lint'], 'deploy', false)).toEqual(['deploy']);
  });

  it('keeps the other dependencies when asked', () => {
    expect(depsAfterDrop(['build'], 'lint', true)).toEqual(['build', 'lint']);
    expect(depsAfterDrop(['build'], 'build', true)).toEqual(['build']);
  });

  it('makes the job run first when dropped on no job', () => {
    expect(depsAfterDrop(['build', 'lint'], null, true)).toEqual([]);
  });
});

describe('stepsAfterDrop', () => {
  it('ignores a drop on a job that left the document', () => {
    const steps = [script('a'), script('b', ['a'])];

    expect(stepsAfterDrop(steps, 'b', 'gone', false)).toBe(steps);
  });

  const depsOf = (steps: PipelineStep[]) => Object.fromEntries(steps.map(s => [s.id, s.deps]));

  it('moves a job with the jobs that wait for it', () => {
    const steps = [script('a'), script('b', ['a']), script('c', ['b']), script('d')];
    expect(depsOf(stepsAfterDrop(steps, 'b', 'd', false))).toEqual({
      a: [],
      b: ['d'],
      c: ['b'],
      d: [],
    });
  });

  it('takes a job out of its place when dropped on a job that waits for it', () => {
    const steps = [script('a'), script('b', ['a']), script('c', ['b'])];
    expect(depsOf(stepsAfterDrop(steps, 'b', 'c', false))).toEqual({ a: [], b: ['c'], c: ['a'] });
  });

  it('gives each job that waited for it what it waited for, once', () => {
    const steps = [
      script('a'),
      script('b', ['a']),
      script('c', ['b', 'a']),
      script('d', ['c']),
      script('e', ['b']),
    ];
    expect(depsOf(stepsAfterDrop(steps, 'b', 'd', true))).toEqual({
      a: [],
      b: ['a', 'd'],
      c: ['a'],
      d: ['c'],
      e: ['a'],
    });
  });

  it('changes nothing when a job is dropped on itself', () => {
    const steps = [script('a'), script('b', ['a'])];
    expect(stepsAfterDrop(steps, 'b', 'b', false)).toBe(steps);
  });
});
