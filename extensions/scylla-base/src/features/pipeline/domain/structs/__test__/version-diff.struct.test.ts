import { describe, expect, it } from 'vitest';
import { versionDiff } from '../version-diff.struct.ts';
import { execNode, literal, version } from './fragment-test-data.ts';

describe('versionDiff', () => {
  it('finds nothing between two versions that run the same', () => {
    expect(versionDiff(version(1), version(2))).toEqual([]);
  });

  it('lists the nodes first, then the parameters', () => {
    const from = version(1, {
      nodes: [execNode('install'), execNode('lint')],
      parameters: [literal('NODE_VERSION', '20'), literal('CACHE', 'on')],
    });
    const to = version(2, {
      nodes: [execNode('install', 'install', '--frozen-lockfile'), execNode('audit')],
      parameters: [literal('NODE_VERSION', '22'), { key: 'NPM_TOKEN', kind: 'secret' }],
    });

    expect(versionDiff(from, to)).toEqual([
      { kind: 'node-added', id: 'audit' },
      { kind: 'node-removed', id: 'lint' },
      { kind: 'node-changed', id: 'install' },
      { kind: 'parameter-added', parameter: { key: 'NPM_TOKEN', kind: 'secret' } },
      { kind: 'parameter-removed', key: 'CACHE' },
      { kind: 'default-changed', key: 'NODE_VERSION', from: '20', to: '22' },
    ]);
  });

  it('does not see a node as changed when only its dependencies move', () => {
    const to = version(2, {
      nodes: [execNode('install'), { ...execNode('test'), deps: ['install'] }],
    });

    expect(versionDiff(version(1), to)).toEqual([]);
  });
});
