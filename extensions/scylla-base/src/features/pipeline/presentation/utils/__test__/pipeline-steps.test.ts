// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type {
  ExecPipelineStep,
  PipelineStep,
  StepDefinition,
} from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
import {
  addStep,
  dependencyCandidates,
  dependentsOf,
  generateUniqueNodeId,
  removeStep,
  renameStep,
  setDependencies,
  stepDepths,
  updateStep,
  waitsFor,
} from '../pipeline-steps.ts';

const execStep = (id: string, deps: string[] = []): ExecPipelineStep => ({
  id,
  deps,
  kind: 'exec',
  command: 'echo',
  args: [id],
  env: [],
});

describe('stepDepths', () => {
  it('puts a step one column after the deepest step it waits for', () => {
    const depths = stepDepths([execStep('a'), execStep('b', ['a']), execStep('c', ['a', 'b'])]);
    expect(Object.fromEntries(depths)).toEqual({ a: 0, b: 1, c: 2 });
  });

  it('puts a step that waits for a missing step in the first column', () => {
    expect(stepDepths([execStep('a', ['ghost'])]).get('a')).toBe(0);
  });
});

describe('waitsFor', () => {
  const steps = [execStep('build'), execStep('test', ['build']), execStep('deploy', ['test'])];

  it('follows the dependencies through the other steps', () => {
    expect(waitsFor(steps, 'deploy', 'build')).toBe(true);
  });

  it('is false the other way, and for a step that does not exist', () => {
    expect(waitsFor(steps, 'build', 'deploy')).toBe(false);
    expect(waitsFor(steps, 'ghost', 'build')).toBe(false);
  });

  it('ends on a loop of dependencies', () => {
    const loop = [execStep('root'), execStep('a', ['root', 'b']), execStep('b', ['a'])];
    expect(waitsFor(loop, 'a', 'b')).toBe(true);
    expect(waitsFor(loop, 'root', 'a')).toBe(false);
  });
});

const ids = (steps: PipelineStep[]) => steps.map(step => step.id);

describe('addStep', () => {
  const definition: StepDefinition = { kind: 'script', shell: 'bash', script: '', env: [] };

  it('gives a taken id a suffix', () => {
    const { steps, id } = addStep([execStep('step')], 'step', definition);
    expect(id).toBe('step_1');
    expect(ids(steps)).toEqual(['step', 'step_1']);
  });

  it('waits for the step it is added after', () => {
    const { steps } = addStep([execStep('build')], 'test', definition, 'build');
    expect(steps[1]).toEqual({ id: 'test', deps: ['build'], ...definition });
  });

  it('waits for nothing when the step it follows does not exist', () => {
    expect(addStep([], 'test', definition, 'ghost').steps[0]?.deps).toEqual([]);
  });
});

describe('updateStep', () => {
  it('keeps the id and the dependencies of the step', () => {
    const steps = updateStep([execStep('a'), execStep('b', ['a'])], 'b', {
      kind: 'script',
      shell: 'sh',
      script: 'make',
      env: [],
    });
    expect(steps[1]).toEqual({
      id: 'b',
      deps: ['a'],
      kind: 'script',
      shell: 'sh',
      script: 'make',
      env: [],
    });
  });
});

describe('renameStep', () => {
  const pipeline = [execStep('build'), execStep('test', ['build']), execStep('lint')];

  it('follows the rename in the dependencies of the other steps', () => {
    const { steps, id } = renameStep(pipeline, 'build', 'compile');
    expect(id).toBe('compile');
    expect(ids(steps)).toEqual(['compile', 'test', 'lint']);
    expect(steps[1]?.deps).toEqual(['compile']);
  });

  it('gives a taken id a suffix', () => {
    expect(renameStep(pipeline, 'build', 'lint').id).toBe('lint_1');
  });

  it('keeps the old id for an empty one', () => {
    const change = renameStep(pipeline, 'build', '   ');
    expect(change).toEqual({ steps: pipeline, id: 'build' });
  });

  it('trims the new id', () => {
    expect(renameStep(pipeline, 'build', '  compile ').id).toBe('compile');
  });
});

describe('removeStep', () => {
  it('removes the dependencies on the step', () => {
    const steps = removeStep([execStep('a'), execStep('b', ['a']), execStep('c', ['a', 'b'])], 'a');
    expect(steps).toEqual([execStep('b'), execStep('c', ['b'])]);
  });
});

describe('setDependencies', () => {
  it('changes the dependencies of one step only', () => {
    const steps = setDependencies([execStep('a'), execStep('b'), execStep('c')], 'c', ['a', 'b']);
    expect(steps.map(step => step.deps)).toEqual([[], [], ['a', 'b']]);
  });
});

describe('dependentsOf', () => {
  it('gives the steps that wait for the step', () => {
    const steps = [execStep('a'), execStep('b', ['a']), execStep('c', ['b']), execStep('d', ['a'])];
    expect(dependentsOf(steps, 'a')).toEqual(['b', 'd']);
  });
});

describe('dependencyCandidates', () => {
  it('leaves out the step and every step that waits for it, so the graph cannot loop', () => {
    const steps = [execStep('a'), execStep('b', ['a']), execStep('c', ['b']), execStep('d')];
    expect(dependencyCandidates(steps, 'b')).toEqual(['a', 'd']);
  });
});

describe('generateUniqueNodeId', () => {
  it('returns the desired id when it is free', () => {
    expect(generateUniqueNodeId('build', new Set())).toBe('build');
  });

  it('suffixes with _1 when the desired id is taken', () => {
    expect(generateUniqueNodeId('build', new Set(['build']))).toBe('build_1');
  });

  it('keeps incrementing the suffix past existing collisions', () => {
    expect(generateUniqueNodeId('build', new Set(['build', 'build_1', 'build_2']))).toBe('build_3');
  });

  it('excludes the node being renamed, so renaming to its own current id is a no-op', () => {
    expect(generateUniqueNodeId('build', new Set(['build']), 'build')).toBe('build');
  });
});
