// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import { nodeRelations, nodeRows, nodeStages } from '../node-list.presenter.ts';

const script = (id: string, deps: string[] = [], body = 'make'): PipelineNodeEntity => ({
  id,
  deps,
  kind: 'script',
  shell: 'sh',
  script: body,
  env: [],
});

describe('nodeRows', () => {
  it('lists the nodes in the order they run, then in the order of the document', () => {
    const rows = nodeRows([script('test', ['build']), script('lint'), script('build')]);
    expect(rows.map(row => [row.node.id, row.depth])).toEqual([
      ['lint', 0],
      ['build', 0],
      ['test', 1],
    ]);
  });

  it('marks a node that cannot run, or whose id the server refuses', () => {
    const rows = nodeRows([script('empty', [], ''), script('Bad Id'), script('ok')]);
    expect(rows.map(row => row.hasIssue)).toEqual([true, true, false]);
  });
});

describe('nodeStages', () => {
  it('groups the nodes that can run together, on the longest path', () => {
    const nodes = [
      script('build'),
      script('lint'),
      script('test', ['build']),
      script('deploy', ['lint', 'test']),
    ];
    expect(nodeStages(nodeRows(nodes)).map(stage => stage.map(row => row.node.id))).toEqual([
      ['build', 'lint'],
      ['test'],
      ['deploy'],
    ]);
  });
});

describe('nodeRelations', () => {
  const nodes = [
    script('build'),
    script('lint'),
    script('test', ['build', 'lint']),
    script('e2e', ['test']),
  ];

  it('names the nodes the focused one waits for, and the ones that wait for it', () => {
    expect(Object.fromEntries(nodeRelations(nodes, 'test'))).toEqual({
      build: 'dependency',
      lint: 'dependency',
      e2e: 'dependent',
    });
  });

  it('relates nothing without a focused node', () => {
    expect(nodeRelations(nodes, null).size).toBe(0);
  });
});
