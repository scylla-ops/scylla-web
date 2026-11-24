import { describe, it, expect } from 'vitest';
import type {
  PipelineNodeEntity,
  NodeDefinition,
} from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import { nodeIcon } from '../node-kind.presenter.ts';
import { envCounts, nodePreview, summarize } from '../node-summary.presenter.ts';

const script = (body: string): NodeDefinition => ({
  kind: 'script',
  shell: 'bash',
  script: body,
  env: [],
});
const exec = (command: string, args: string[] = []): Extract<NodeDefinition, { kind: 'exec' }> => ({
  kind: 'exec',
  command,
  args,
  env: [],
});
const node = (id: string, script: string): PipelineNodeEntity => ({
  id,
  deps: [],
  kind: 'script',
  shell: 'bash',
  script,
  env: [],
});

describe('summarize', () => {
  it('shows a refused id before an empty script: the server rejects the whole pipeline for it', () => {
    expect(summarize(node('Build', '')).problem).toEqual({
      label: 'Invalid node ID',
      detail: 'The node ID cannot contain "B". Use only lowercase letters (a-z), digits, - and _.',
    });
  });

  it('shows what stops a valid node from running', () => {
    expect(summarize(node('build', '')).problem).toEqual({
      label: 'The script is empty.',
      detail: 'The script is empty.',
    });
  });

  it('shows no problem for a node that can be saved and run', () => {
    expect(summarize(node('build', 'make')).problem).toBeNull();
  });

  it('shows the icon of the template whose code the node runs', () => {
    expect(summarize(node('checkout', 'git clone x .'), { iconHint: 'git' }).icon).toBe(
      nodeIcon('script', 'git'),
    );
    expect(summarize(node('checkout', 'git clone x .')).icon).toBe(nodeIcon('script'));
  });
});

describe('summarize: the conditional nodes', () => {
  const ifNode: PipelineNodeEntity = {
    id: 'is-main',
    deps: [],
    env: [],
    kind: 'switch',
    cases: [{ port: 'true', combinator: 'all', rules: [] }],
    otherwise: 'false',
    allMatches: false,
  };

  it('gives a switch one output for each port, in order', () => {
    expect(summarize(ifNode).outputs).toEqual([{ port: 'true' }, { port: 'false' }]);
  });

  it('adds the red error output to a node that runs a step, when it shows it', () => {
    expect(summarize(node('test', 'make')).outputs).toEqual([{}]);
    expect(summarize(node('test', 'make'), { errorPort: true }).outputs).toEqual([
      {},
      { port: 'error', error: true },
    ]);
  });

  it('shows the issue of a switch with a short label and the whole reason', () => {
    expect(summarize(ifNode).problem).toEqual({
      label: 'Invalid switch',
      detail: 'The case true needs 1 to 32 rules.',
    });
  });

  it('shows a switch port named error as the issue of the switch', () => {
    expect(summarize({ ...ifNode, otherwise: 'error' }).problem).toEqual({
      label: 'Invalid switch',
      detail:
        'The port name "error" is for the error output of a node that runs a step. Use another name.',
    });
  });

  it('shows the issue that the pipeline finds, in place of its own', () => {
    expect(
      summarize(node('deploy', 'make'), {
        issue: {
          kind: 'need',
          issue: { kind: 'unknown-port', need: { node: 'is-main', port: 'maybe' } },
        },
      }).problem,
    ).toEqual({ label: 'Invalid link', detail: 'is-main has no port maybe.' });
  });

  it('names the kind of a switch and of a merge, which run nothing', () => {
    const merge: PipelineNodeEntity = { id: 'join', deps: [], kind: 'merge' };
    expect(summarize(ifNode, { issue: null })).toMatchObject({ kind: 'switch', preview: '' });
    expect(summarize(merge, { issue: null })).toMatchObject({
      kind: 'merge',
      variables: 0,
      outputs: [{}],
    });
  });
});

describe('nodePreview', () => {
  it('shows a command with its arguments', () => {
    expect(nodePreview(exec('docker', ['build', '.']))).toBe('docker build .');
  });

  it('skips the shebang, the comments and the set line of a script', () => {
    expect(
      nodePreview(script('#!/usr/bin/env bash\nset -euo pipefail\n\n# tests\n  npm test\n')),
    ).toBe('npm test');
  });

  it('is empty for a script with nothing to run', () => {
    expect(nodePreview(script('#!/bin/sh\n'))).toBe('');
  });
});

describe('envCounts', () => {
  it('counts the secrets apart from the plain variables', () => {
    expect(
      envCounts({
        ...exec('make'),
        env: [
          { key: 'A', kind: 'literal', value: '1' },
          { key: 'B', kind: 'secret', secretRef: 'token' },
          { key: 'C', kind: 'literal', value: '3' },
        ],
      }),
    ).toEqual({ variables: 2, secrets: 1 });
  });
});
