// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { PipelineStepEntity } from '@base/features/pipeline/domain/entities/pipeline-step.entity.ts';
import {
  depsAfterDrop,
  stepRelations,
  stepRows,
  stepStages,
  stepsAfterDrop,
} from '../step-list.presenter.ts';

const script = (id: string, deps: string[] = [], body = 'make'): PipelineStepEntity => ({
  id,
  deps,
  kind: 'script',
  shell: 'sh',
  script: body,
  env: [],
});

describe('stepRows', () => {
  it('lists the steps in the order they run, then in the order of the document', () => {
    const rows = stepRows([script('test', ['build']), script('lint'), script('build')]);
    expect(rows.map(row => [row.step.id, row.depth])).toEqual([
      ['lint', 0],
      ['build', 0],
      ['test', 1],
    ]);
  });

  it('marks a step that cannot run, or whose id the server refuses', () => {
    const rows = stepRows([script('empty', [], ''), script('Bad Id'), script('ok')]);
    expect(rows.map(row => row.hasIssue)).toEqual([true, true, false]);
  });
});

describe('stepStages', () => {
  it('groups the steps that can run together, on the longest path', () => {
    const steps = [
      script('build'),
      script('lint'),
      script('test', ['build']),
      script('deploy', ['lint', 'test']),
    ];
    expect(stepStages(stepRows(steps)).map(stage => stage.map(row => row.step.id))).toEqual([
      ['build', 'lint'],
      ['test'],
      ['deploy'],
    ]);
  });
});

describe('stepRelations', () => {
  const steps = [
    script('build'),
    script('lint'),
    script('test', ['build', 'lint']),
    script('e2e', ['test']),
  ];

  it('names the steps the focused one waits for, and the ones that wait for it', () => {
    expect(Object.fromEntries(stepRelations(steps, 'test'))).toEqual({
      build: 'dependency',
      lint: 'dependency',
      e2e: 'dependent',
    });
  });

  it('relates nothing without a focused step', () => {
    expect(stepRelations(steps, null).size).toBe(0);
  });
});

describe('depsAfterDrop', () => {
  it('makes the step wait for the step it is dropped on, and for no other', () => {
    expect(depsAfterDrop(['build', 'lint'], 'deploy', false)).toEqual(['deploy']);
  });

  it('keeps the other dependencies when asked', () => {
    expect(depsAfterDrop(['build'], 'lint', true)).toEqual(['build', 'lint']);
    expect(depsAfterDrop(['build'], 'build', true)).toEqual(['build']);
  });

  it('makes the step run first when dropped on no step', () => {
    expect(depsAfterDrop(['build', 'lint'], null, true)).toEqual([]);
  });
});

describe('stepsAfterDrop', () => {
  it('ignores a drop on a step that left the document', () => {
    const steps = [script('a'), script('b', ['a'])];

    expect(stepsAfterDrop(steps, 'b', 'gone', false)).toBe(steps);
  });

  const depsOf = (steps: PipelineStepEntity[]) =>
    Object.fromEntries(steps.map(s => [s.id, s.deps]));

  it('moves a step with the steps that wait for it', () => {
    const steps = [script('a'), script('b', ['a']), script('c', ['b']), script('d')];
    expect(depsOf(stepsAfterDrop(steps, 'b', 'd', false))).toEqual({
      a: [],
      b: ['d'],
      c: ['b'],
      d: [],
    });
  });

  it('takes a step out of its place when dropped on a step that waits for it', () => {
    const steps = [script('a'), script('b', ['a']), script('c', ['b'])];
    expect(depsOf(stepsAfterDrop(steps, 'b', 'c', false))).toEqual({ a: [], b: ['c'], c: ['a'] });
  });

  it('gives each step that waited for it what it waited for, once', () => {
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

  it('changes nothing when a step is dropped on itself', () => {
    const steps = [script('a'), script('b', ['a'])];
    expect(stepsAfterDrop(steps, 'b', 'b', false)).toBe(steps);
  });
});
