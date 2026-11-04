// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type {
  ExecPipelineNodeEntity,
  PipelineNodeEntity,
  NodeDefinition,
} from '../pipeline-node.entity.ts';
import {
  addNode,
  dependencyCandidates,
  dependentsOf,
  uniqueNodeId,
  hasRepeats,
  moveNode,
  repeatedNodeIds,
  newPipeline,
  pipelineIssue,
  removeNode,
  renameNode,
  setDependencies,
  nodeDepths,
  updateNode,
  waitsFor,
} from '../pipeline.entity.ts';

const execNode = (id: string, deps: string[] = []): ExecPipelineNodeEntity => ({
  id,
  deps,
  kind: 'exec',
  command: 'echo',
  args: [id],
  env: [],
});

const node = (id: string): PipelineNodeEntity => ({
  id,
  deps: [],
  env: [],
  kind: 'exec',
  command: 'make',
  args: [],
});

describe('nodeDepths', () => {
  it('puts a node one column after the deepest node it waits for', () => {
    const depths = nodeDepths([execNode('a'), execNode('b', ['a']), execNode('c', ['a', 'b'])]);
    expect(Object.fromEntries(depths)).toEqual({ a: 0, b: 1, c: 2 });
  });

  it('puts a node that waits for a missing node in the first column', () => {
    expect(nodeDepths([execNode('a', ['ghost'])]).get('a')).toBe(0);
  });
});

describe('waitsFor', () => {
  const nodes = [execNode('build'), execNode('test', ['build']), execNode('deploy', ['test'])];

  it('follows the dependencies through the other nodes', () => {
    expect(waitsFor(nodes, 'deploy', 'build')).toBe(true);
  });

  it('is false the other way, and for a node that does not exist', () => {
    expect(waitsFor(nodes, 'build', 'deploy')).toBe(false);
    expect(waitsFor(nodes, 'ghost', 'build')).toBe(false);
  });

  it('ends on a loop of dependencies', () => {
    const loop = [execNode('root'), execNode('a', ['root', 'b']), execNode('b', ['a'])];
    expect(waitsFor(loop, 'a', 'b')).toBe(true);
    expect(waitsFor(loop, 'root', 'a')).toBe(false);
  });
});

const ids = (nodes: PipelineNodeEntity[]) => nodes.map(node => node.id);

describe('addNode', () => {
  const definition: NodeDefinition = { kind: 'script', shell: 'bash', script: '', env: [] };

  it('gives a taken id a suffix', () => {
    const { nodes, id } = addNode([execNode('node')], 'node', definition);
    expect(id).toBe('node_1');
    expect(ids(nodes)).toEqual(['node', 'node_1']);
  });

  it('waits for the node it is added after', () => {
    const { nodes } = addNode([execNode('build')], 'test', definition, 'build');
    expect(nodes[1]).toEqual({ id: 'test', deps: ['build'], ...definition });
  });

  it('waits for nothing when the node it follows does not exist', () => {
    expect(addNode([], 'test', definition, 'ghost').nodes[0]?.deps).toEqual([]);
  });
});

describe('updateNode', () => {
  it('keeps the id and the dependencies of the node', () => {
    const nodes = updateNode([execNode('a'), execNode('b', ['a'])], 'b', {
      kind: 'script',
      shell: 'sh',
      script: 'make',
      env: [],
    });
    expect(nodes[1]).toEqual({
      id: 'b',
      deps: ['a'],
      kind: 'script',
      shell: 'sh',
      script: 'make',
      env: [],
    });
  });
});

describe('renameNode', () => {
  const pipeline = [execNode('build'), execNode('test', ['build']), execNode('lint')];

  it('follows the rename in the dependencies of the other nodes', () => {
    const { nodes, id } = renameNode(pipeline, 'build', 'compile');
    expect(id).toBe('compile');
    expect(ids(nodes)).toEqual(['compile', 'test', 'lint']);
    expect(nodes[1]?.deps).toEqual(['compile']);
  });

  it('gives a taken id a suffix', () => {
    expect(renameNode(pipeline, 'build', 'lint').id).toBe('lint_1');
  });

  it('keeps the old id for an empty one', () => {
    const change = renameNode(pipeline, 'build', '   ');
    expect(change).toEqual({ nodes: pipeline, id: 'build' });
  });

  it('trims the new id', () => {
    expect(renameNode(pipeline, 'build', '  compile ').id).toBe('compile');
  });
});

describe('removeNode', () => {
  it('removes the dependencies on the node', () => {
    const nodes = removeNode([execNode('a'), execNode('b', ['a']), execNode('c', ['a', 'b'])], 'a');
    expect(nodes).toEqual([execNode('b'), execNode('c', ['b'])]);
  });
});

describe('setDependencies', () => {
  it('changes the dependencies of one node only', () => {
    const nodes = setDependencies([execNode('a'), execNode('b'), execNode('c')], 'c', ['a', 'b']);
    expect(nodes.map(node => node.deps)).toEqual([[], [], ['a', 'b']]);
  });
});

describe('dependentsOf', () => {
  it('gives the nodes that wait for the node', () => {
    const nodes = [execNode('a'), execNode('b', ['a']), execNode('c', ['b']), execNode('d', ['a'])];
    expect(dependentsOf(nodes, 'a')).toEqual(['b', 'd']);
  });
});

describe('dependencyCandidates', () => {
  it('leaves out the node and every node that waits for it, so the graph cannot loop', () => {
    const nodes = [execNode('a'), execNode('b', ['a']), execNode('c', ['b']), execNode('d')];
    expect(dependencyCandidates(nodes, 'b')).toEqual(['a', 'd']);
  });
});

describe('uniqueNodeId', () => {
  it('returns the desired id when it is free', () => {
    expect(uniqueNodeId('build', new Set())).toBe('build');
  });

  it('suffixes with _1 when the desired id is taken', () => {
    expect(uniqueNodeId('build', new Set(['build']))).toBe('build_1');
  });

  it('keeps incrementing the suffix past existing collisions', () => {
    expect(uniqueNodeId('build', new Set(['build', 'build_1', 'build_2']))).toBe('build_3');
  });

  it('excludes the node being renamed, so renaming to its own current id is a no-op', () => {
    expect(uniqueNodeId('build', new Set(['build']), 'build')).toBe('build');
  });
});

describe('hasRepeats', () => {
  const node = (id: string, deps: string[] = []): PipelineNodeEntity => ({
    id,
    deps,
    kind: 'script',
    shell: 'sh',
    script: '',
    env: [],
  });

  it('is false for nodes with distinct ids and distinct dependencies', () => {
    expect(hasRepeats([node('a'), node('b', ['a'])])).toBe(false);
  });

  it('is true when two nodes share an id', () => {
    expect(hasRepeats([node('a'), node('a')])).toBe(true);
  });

  it('is true when a node lists a dependency twice', () => {
    expect(hasRepeats([node('a'), node('b', ['a', 'a'])])).toBe(true);
  });
});

describe('pipelineIssue', () => {
  it('accepts a name of one word and node ids the server accepts', () => {
    expect(pipelineIssue({ name: 'nightly', nodes: [node('build'), node('test-2')] })).toBeNull();
  });

  it('says the name first, as it is the first field of the form', () => {
    expect(pipelineIssue({ name: 'my pipeline', nodes: [node('Build')] })).toEqual({
      kind: 'name',
      issue: 'spaces',
    });
  });

  it('names every node id the server refuses', () => {
    expect(
      pipelineIssue({ name: 'nightly', nodes: [node('Build'), node('ok'), node('a b')] }),
    ).toEqual({
      kind: 'node-ids',
      ids: ['Build', 'a b'],
    });
  });
});

describe('newPipeline', () => {
  it('starts from two nodes, the second waiting for the first', () => {
    expect(newPipeline('p').nodes.map(({ id, deps }) => ({ id, deps }))).toEqual([
      { id: 'welcome', deps: [] },
      { id: 'example', deps: ['welcome'] },
    ]);
  });

  it('can be saved as it is', () => {
    expect(pipelineIssue(newPipeline('p'))).toBeNull();
  });
});

const script = (id: string, deps: string[] = []): PipelineNodeEntity => ({
  id,
  deps,
  kind: 'script',
  shell: 'sh',
  script: 'make',
  env: [],
});
const depsOf = (nodes: PipelineNodeEntity[]): Record<string, string[]> =>
  Object.fromEntries(nodes.map(s => [s.id, s.deps]));

describe('moveNode: the dependencies of the moved node', () => {
  it('makes the node wait for the target, and for no other', () => {
    expect(
      depsOf(
        moveNode(
          [script('build'), script('lint'), script('deploy'), script('x', ['build', 'lint'])],
          'x',
          'deploy',
          false,
        ),
      ).x,
    ).toEqual(['deploy']);
  });

  it('keeps the other dependencies when asked', () => {
    const nodes = [script('build'), script('lint'), script('x', ['build'])];
    expect(depsOf(moveNode(nodes, 'x', 'lint', true)).x).toEqual(['build', 'lint']);
    expect(depsOf(moveNode(nodes, 'x', 'build', true)).x).toEqual(['build']);
  });

  it('makes the node run first when moved after no node', () => {
    expect(
      depsOf(
        moveNode(
          [script('build'), script('lint'), script('x', ['build', 'lint'])],
          'x',
          null,
          true,
        ),
      ).x,
    ).toEqual([]);
  });
});

describe('moveNode', () => {
  it('ignores a target that left the document', () => {
    const nodes = [script('a'), script('b', ['a'])];

    expect(moveNode(nodes, 'b', 'gone', false)).toBe(nodes);
  });

  it('moves a node with the nodes that wait for it', () => {
    const nodes = [script('a'), script('b', ['a']), script('c', ['b']), script('d')];
    expect(depsOf(moveNode(nodes, 'b', 'd', false))).toEqual({
      a: [],
      b: ['d'],
      c: ['b'],
      d: [],
    });
  });

  it('takes a node out of its place when moved after a node that waits for it', () => {
    const nodes = [script('a'), script('b', ['a']), script('c', ['b'])];
    expect(depsOf(moveNode(nodes, 'b', 'c', false))).toEqual({ a: [], b: ['c'], c: ['a'] });
  });

  it('gives each node that waited for it what it waited for, once', () => {
    const nodes = [
      script('a'),
      script('b', ['a']),
      script('c', ['b', 'a']),
      script('d', ['c']),
      script('e', ['b']),
    ];
    expect(depsOf(moveNode(nodes, 'b', 'd', true))).toEqual({
      a: [],
      b: ['a', 'd'],
      c: ['a'],
      d: ['c'],
      e: ['a'],
    });
  });

  it('changes nothing when a node is moved after itself', () => {
    const nodes = [script('a'), script('b', ['a'])];
    expect(moveNode(nodes, 'b', 'b', false)).toBe(nodes);
  });
});

describe('repeatedNodeIds', () => {
  it('names each id that two nodes or more share, once', () => {
    expect(repeatedNodeIds([node('build'), node('test'), node('build'), node('build')])).toEqual([
      'build',
    ]);
  });

  it('is empty when each node has its own id', () => {
    expect(repeatedNodeIds([node('build'), node('test')])).toEqual([]);
  });
});

describe('pipelineIssue: repeated ids', () => {
  it('refuses two nodes with the same id, before it looks at the ids themselves', () => {
    expect(pipelineIssue({ name: 'nightly', nodes: [node('Build'), node('Build')] })).toEqual({
      kind: 'repeated-ids',
      ids: ['Build'],
    });
  });
});
