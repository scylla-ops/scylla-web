// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { PipelineStepEntity } from '@base/features/pipeline/domain/entities/pipeline-step.entity.ts';
import { stepRelations, stepRows, stepStages } from '../step-list.presenter.ts';

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
