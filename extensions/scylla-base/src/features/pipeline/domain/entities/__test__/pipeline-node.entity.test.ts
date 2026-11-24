// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  blankDefinition,
  nodeIssue,
  nodeRunIssue,
  portsOf,
  switchIssue,
  withDefinition,
  withDependencies,
  withoutDependency,
  withRenamedReference,
  type PipelineNodeEntity,
  type NodeDefinition,
  type SwitchCase,
  type SwitchDefinition,
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
const build: PipelineNodeEntity = {
  id: 'build',
  deps: [{ node: 'lint' }, { node: 'fetch', port: 'error' }],
  ...script('make'),
};

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
      deps: build.deps,
      ...exec('npm', ['ci']),
    });
  });
});

describe('withDependencies', () => {
  it('replaces the dependencies only', () => {
    expect(withDependencies(build, [{ node: 'test' }])).toEqual({
      ...build,
      deps: [{ node: 'test' }],
    });
  });
});

describe('withoutDependency', () => {
  it('drops the dependency on the node', () => {
    expect(withoutDependency(build, 'fetch').deps).toEqual([{ node: 'lint' }]);
  });

  it('gives back the same node when it does not wait for that one', () => {
    expect(withoutDependency(build, 'deploy')).toBe(build);
  });
});

describe('withRenamedReference', () => {
  it('renames the node itself when it is the renamed one', () => {
    expect(withRenamedReference(build, 'build', 'compile').id).toBe('compile');
  });

  it('follows the rename in its dependencies, and keeps their ports', () => {
    expect(withRenamedReference(build, 'fetch', 'download').deps).toEqual([
      { node: 'lint' },
      { node: 'download', port: 'error' },
    ]);
  });
});

const rule = (
  overrides: Partial<SwitchCase['rules'][number]> = {},
): SwitchCase['rules'][number] => ({
  left: { kind: 'var', name: 'SCYLLA_BRANCH' },
  test: 'equals',
  right: { kind: 'literal', value: 'main' },
  ...overrides,
});
const ifSwitch = (overrides: Partial<SwitchDefinition> = {}): SwitchDefinition => ({
  env: [],
  kind: 'switch',
  cases: [{ port: 'true', combinator: 'all', rules: [rule()] }],
  otherwise: 'false',
  allMatches: false,
  ...overrides,
});
const withRule = (overrides: Partial<SwitchCase['rules'][number]>) =>
  ifSwitch({ cases: [{ port: 'true', combinator: 'all', rules: [rule(overrides)] }] });

describe('portsOf', () => {
  it('gives the cases of a switch in order, then otherwise', () => {
    expect(portsOf(ifSwitch())).toEqual(['true', 'false']);
    expect(portsOf(ifSwitch({ otherwise: undefined }))).toEqual(['true']);
  });

  it('gives error for a node that runs a step, and no port for a merge', () => {
    expect(portsOf(script('make'))).toEqual(['error']);
    expect(portsOf({ kind: 'merge' })).toEqual([]);
  });
});

describe('switchIssue', () => {
  it('accepts an if and the blank switch of the palette', () => {
    expect(switchIssue(ifSwitch())).toBeNull();
    expect(switchIssue(blankDefinition('switch') as SwitchDefinition)).toBeNull();
  });

  it('needs 1 to 16 cases', () => {
    expect(switchIssue(ifSwitch({ cases: [] }))).toEqual({ kind: 'case-count', count: 0 });
    const cases = Array.from({ length: 17 }, (_, i) => ({
      port: `c${i}`,
      combinator: 'all' as const,
      rules: [rule()],
    }));
    expect(switchIssue(ifSwitch({ cases }))).toEqual({ kind: 'case-count', count: 17 });
  });

  it('needs 1 to 32 rules in each case', () => {
    expect(
      switchIssue(ifSwitch({ cases: [{ port: 'true', combinator: 'any', rules: [] }] })),
    ).toEqual({ kind: 'rule-count', port: 'true', count: 0 });
  });

  it('refuses a port with the wrong form, and a port two times', () => {
    expect(switchIssue(ifSwitch({ otherwise: 'Else' }))).toMatchObject({
      kind: 'port',
      port: 'Else',
    });
    expect(switchIssue(ifSwitch({ otherwise: 'true' }))).toEqual({
      kind: 'repeated-port',
      port: 'true',
    });
  });

  it('refuses the name error for a case and for otherwise: it is the error port of a step', () => {
    expect(
      switchIssue(ifSwitch({ cases: [{ port: 'error', combinator: 'all', rules: [rule()] }] })),
    ).toEqual({ kind: 'reserved-port', port: 'error' });
    expect(switchIssue(ifSwitch({ otherwise: 'error' }))).toEqual({
      kind: 'reserved-port',
      port: 'error',
    });
    expect(switchIssue(ifSwitch({ otherwise: 'errors' }))).toBeNull();
  });

  it('refuses a text that is not a number in a number test', () => {
    expect(
      switchIssue(withRule({ test: 'number_gt', right: { kind: 'literal', value: '1.5e3' } })),
    ).toBeNull();
    expect(
      switchIssue(withRule({ test: 'number_gt', right: { kind: 'literal', value: ' -.5 ' } })),
    ).toBeNull();
    for (const value of ['', 'ten', '0x10', 'inf', '1e999'])
      expect(
        switchIssue(withRule({ test: 'number_gt', right: { kind: 'literal', value } })),
      ).toEqual({ kind: 'not-a-number', port: 'true', value });
  });

  it('refuses a variable or an output key that is not a variable name', () => {
    expect(switchIssue(withRule({ left: { kind: 'var', name: '1BRANCH' } }))).toEqual({
      kind: 'variable',
      port: 'true',
      name: '1BRANCH',
    });
    expect(
      switchIssue(withRule({ left: { kind: 'output', node: 'build', key: 'my-key' } })),
    ).toEqual({ kind: 'output-key', port: 'true', key: 'my-key' });
  });

  it('accepts a SCYLLA_ variable, which the switch only reads', () => {
    expect(switchIssue(withRule({ left: { kind: 'var', name: 'SCYLLA_ERROR' } }))).toBeNull();
  });

  it('refuses a text over 64 KiB, or with a NUL character', () => {
    expect(
      switchIssue(withRule({ right: { kind: 'literal', value: 'é'.repeat(32 * 1024 + 1) } })),
    ).toEqual({ kind: 'too-long', port: 'true' });
    expect(switchIssue(withRule({ right: { kind: 'literal', value: 'a\0b' } }))).toEqual({
      kind: 'too-long',
      port: 'true',
    });
  });
});

describe('nodeIssue', () => {
  it('says the switch issue of a switch node', () => {
    expect(nodeIssue({ id: 'is-main', deps: [], ...ifSwitch({ cases: [] }) })).toEqual({
      kind: 'switch',
      issue: { kind: 'case-count', count: 0 },
    });
  });

  it('refuses a merge with no need, and the same need two times', () => {
    expect(nodeIssue({ id: 'm', deps: [], kind: 'merge' })).toEqual({
      kind: 'need',
      issue: { kind: 'merge-without-needs' },
    });
    expect(
      nodeIssue({
        id: 'm',
        deps: [
          { node: 'a', port: 'error' },
          { node: 'a', port: 'error' },
        ],
        kind: 'merge',
      }),
    ).toEqual({ kind: 'need', issue: { kind: 'repeated', need: { node: 'a', port: 'error' } } });
  });
});
