import { describe, it, expect } from 'vitest';
import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import { nodeDetails } from '../node-details.presenter.ts';

describe('nodeDetails', () => {
  it('shows the script with its shell, and each setting of a node that runs a step', () => {
    const details = nodeDetails({
      id: 'test',
      deps: [],
      kind: 'script',
      shell: 'bash',
      script: 'pnpm test',
      env: [
        { key: 'CI', kind: 'literal', value: 'true' },
        { key: 'NPM_TOKEN', kind: 'secret', secretRef: 'npm-token' },
      ],
      workingDir: 'web',
      timeoutSeconds: 1200,
      retries: 2,
      image: 'node:24',
    });

    expect(details.code).toEqual({ title: 'Script · bash', text: 'pnpm test' });
    expect(details.rows).toEqual([
      { label: 'Working directory', value: 'web', code: true },
      { label: 'Container image', value: 'node:24', code: true },
      { label: 'Timeout', value: '20m 0s' },
      { label: 'Retries', value: '2' },
    ]);
    expect(details.env).toEqual([
      { key: 'CI', value: 'true', secret: false },
      { key: 'NPM_TOKEN', value: 'npm-token', secret: true },
    ]);
  });

  it('says what a node without a setting does: on the agent, with no timeout and no retry', () => {
    const details = nodeDetails({
      id: 'build',
      deps: [],
      kind: 'exec',
      command: 'cargo',
      args: ['build', '--features', 'a b', "it's"],
      env: [],
    });

    expect(details.code).toEqual({
      title: 'Command',
      text: `cargo build --features 'a b' 'it'"'"'s'`,
    });
    expect(details.rows).toEqual([
      { label: 'Container image', value: 'None: the node runs on the agent' },
      { label: 'Timeout', value: 'No timeout' },
      { label: 'Retries', value: '0' },
    ]);
  });

  it('writes each case of a switch as the port it opens and the rules it matches', () => {
    const node: PipelineNodeEntity = {
      id: 'is-main',
      deps: [],
      env: [],
      kind: 'switch',
      cases: [
        {
          port: 'main',
          combinator: 'any',
          rules: [
            {
              left: { kind: 'var', name: 'BRANCH' },
              test: 'equals',
              right: { kind: 'literal', value: 'main' },
            },
            { left: { kind: 'output', node: 'test', key: 'tag' }, test: 'not_empty' },
          ],
        },
      ],
      otherwise: 'other',
      allMatches: true,
    };

    const details = nodeDetails(node);

    expect(details.code).toBeUndefined();
    expect(details.cases).toEqual([
      {
        port: 'main',
        match: 'Any',
        rules: ['$BRANCH is equal to "main"', 'test.tag is not empty'],
      },
    ]);
    expect(details.rows).toEqual([
      { label: 'Port when no case matches', value: 'other', code: true },
    ]);
    expect(details.allMatches).toBe('Open the port of each case that matches');
  });

  it('shows nothing to run for a merge', () => {
    expect(nodeDetails({ id: 'join', deps: [{ node: 'a' }], kind: 'merge' })).toEqual({
      code: undefined,
      rows: [],
      env: [],
      cases: [],
    });
  });
});
