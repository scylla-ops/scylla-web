// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { ExecPipelineStep } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
import { stepDepths, waitsFor } from '../pipeline-steps.ts';

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
