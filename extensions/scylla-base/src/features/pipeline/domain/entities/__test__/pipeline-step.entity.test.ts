// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  stepIssue,
  withDefinition,
  withDependencies,
  withoutDependency,
  withRenamedReference,
  type PipelineStepEntity,
  type StepDefinition,
} from '../pipeline-step.entity.ts';

const script = (body: string): StepDefinition => ({
  kind: 'script',
  shell: 'bash',
  script: body,
  env: [],
});
const exec = (command: string, args: string[] = []): StepDefinition => ({
  kind: 'exec',
  command,
  args,
  env: [],
});
const build: PipelineStepEntity = { id: 'build', deps: ['lint', 'fetch'], ...script('make') };

describe('stepIssue', () => {
  it('flags a command step without a command', () => {
    expect(stepIssue(exec('  '))).toBe('missing-command');
  });

  it('flags a blank script', () => {
    expect(stepIssue(script('\n  \n'))).toBe('empty-script');
  });

  it('finds nothing wrong with a runnable step', () => {
    expect(stepIssue(exec('make'))).toBeNull();
    expect(stepIssue(script('make'))).toBeNull();
  });
});

describe('withDefinition', () => {
  it('replaces what the step runs, and keeps its id and its dependencies', () => {
    expect(withDefinition(build, exec('npm', ['ci']))).toEqual({
      id: 'build',
      deps: ['lint', 'fetch'],
      ...exec('npm', ['ci']),
    });
  });
});

describe('withDependencies', () => {
  it('replaces the dependencies only', () => {
    expect(withDependencies(build, ['test'])).toEqual({ ...build, deps: ['test'] });
  });
});

describe('withoutDependency', () => {
  it('drops the dependency on the step', () => {
    expect(withoutDependency(build, 'lint').deps).toEqual(['fetch']);
  });

  it('gives back the same step when it does not wait for that one', () => {
    expect(withoutDependency(build, 'deploy')).toBe(build);
  });
});

describe('withRenamedReference', () => {
  it('renames the step itself when it is the renamed one', () => {
    expect(withRenamedReference(build, 'build', 'compile').id).toBe('compile');
  });

  it('follows the rename in its dependencies', () => {
    expect(withRenamedReference(build, 'lint', 'check').deps).toEqual(['check', 'fetch']);
  });
});
