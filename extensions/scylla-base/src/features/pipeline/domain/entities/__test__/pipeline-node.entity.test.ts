// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  nodeRunIssue,
  withDefinition,
  withDependencies,
  withoutDependency,
  withRenamedReference,
  type PipelineNodeEntity,
  type NodeDefinition,
} from '../pipeline-node.entity.ts';

const script = (body: string): NodeDefinition => ({
  kind: 'script',
  shell: 'bash',
  script: body,
  env: [],
});
const exec = (command: string, args: string[] = []): NodeDefinition => ({
  kind: 'exec',
  command,
  args,
  env: [],
});
const build: PipelineNodeEntity = { id: 'build', deps: ['lint', 'fetch'], ...script('make') };

describe('nodeRunIssue', () => {
  it('flags a command node without a command', () => {
    expect(nodeRunIssue(exec('  '))).toBe('missing-command');
  });

  it('flags a blank script', () => {
    expect(nodeRunIssue(script('\n  \n'))).toBe('empty-script');
  });

  it('finds nothing wrong with a runnable node', () => {
    expect(nodeRunIssue(exec('make'))).toBeNull();
    expect(nodeRunIssue(script('make'))).toBeNull();
  });
});

describe('withDefinition', () => {
  it('replaces what the node runs, and keeps its id and its dependencies', () => {
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
  it('drops the dependency on the node', () => {
    expect(withoutDependency(build, 'lint').deps).toEqual(['fetch']);
  });

  it('gives back the same node when it does not wait for that one', () => {
    expect(withoutDependency(build, 'deploy')).toBe(build);
  });
});

describe('withRenamedReference', () => {
  it('renames the node itself when it is the renamed one', () => {
    expect(withRenamedReference(build, 'build', 'compile').id).toBe('compile');
  });

  it('follows the rename in its dependencies', () => {
    expect(withRenamedReference(build, 'lint', 'check').deps).toEqual(['check', 'fetch']);
  });
});
