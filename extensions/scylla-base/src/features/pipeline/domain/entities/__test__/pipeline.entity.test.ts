// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type {
  Dependency,
  ExecPipelineNodeEntity,
  PipelineNodeEntity,
  NodeDefinition,
  SwitchPipelineNodeEntity,
} from '../pipeline-node.entity.ts';
import {
  addNode,
  dependencyCandidates,
  dependentsOf,
  dropPort,
  nodeIssues,
  renamePort,
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

/** A need as the JSON tab writes it: `build`, or `is-main:true`. */
const need = (text: string): Dependency => {
  const [node, port] = text.split(':');
  return port ? { node, port } : { node };
};
const needs = (texts: string[]) => texts.map(need);
const textOf = ({ node, port }: Dependency) => (port ? `${node}:${port}` : node);

const execNode = (id: string, deps: string[] = []): ExecPipelineNodeEntity => ({
  id,
  deps: needs(deps),
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
    expect(nodes[1]).toEqual({ id: 'test', deps: needs(['build']), ...definition });
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
      deps: needs(['a']),
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
    expect(nodes[1]?.deps).toEqual(needs(['compile']));
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
    const nodes = setDependencies([execNode('a'), execNode('b'), execNode('c')], 'c', needs(['a', 'b']));
    expect(nodes.map(node => node.deps.map(textOf))).toEqual([[], [], ['a', 'b']]);
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
    expect(dependencyCandidates(nodes, 'b').map(textOf)).toEqual(['a', 'a:error', 'd', 'd:error']);
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
    deps: needs(deps),
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
      { id: 'example', deps: needs(['welcome']) },
    ]);
  });

  it('can be saved as it is', () => {
    expect(pipelineIssue(newPipeline('p'))).toBeNull();
  });
});

const script = (id: string, deps: string[] = []): PipelineNodeEntity => ({
  id,
  deps: needs(deps),
  kind: 'script',
  shell: 'sh',
  script: 'make',
  env: [],
});
const depsOf = (nodes: PipelineNodeEntity[]): Record<string, string[]> =>
  Object.fromEntries(nodes.map(s => [s.id, s.deps.map(textOf)]));

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

/** A switch on `SCYLLA_BRANCH`: the case `true`, and `otherwise: false`. */
const ifNode = (id: string, deps: string[] = []): SwitchPipelineNodeEntity => ({
  id,
  deps: needs(deps),
  env: [],
  kind: 'switch',
  cases: [
    {
      port: 'true',
      combinator: 'all',
      rules: [
        {
          left: { kind: 'var', name: 'SCYLLA_BRANCH' },
          test: 'equals',
          right: { kind: 'literal', value: 'main' },
        },
      ],
    },
  ],
  otherwise: 'false',
  allMatches: false,
});
const merge = (id: string, deps: string[]): PipelineNodeEntity => ({
  id,
  deps: needs(deps),
  kind: 'merge',
});

describe('the needs on a port', () => {
  const pipeline = [
    execNode('build'),
    ifNode('is-main', ['build']),
    execNode('deploy', ['build', 'is-main:true']),
    execNode('notify', ['build:error']),
  ];

  it('keeps the port of each need when its node is renamed', () => {
    const { nodes } = renameNode(pipeline, 'is-main', 'on-main');
    expect(depsOf(nodes).deploy).toEqual(['build', 'on-main:true']);
  });

  it('follows the rename of a port in the needs that name it', () => {
    expect(depsOf(renamePort(pipeline, 'is-main', 'true', 'yes')).deploy).toEqual([
      'build',
      'is-main:yes',
    ]);
  });

  it('removes the needs on a port that goes, and keeps the others', () => {
    const nodes = dropPort(pipeline, 'build', 'error');
    expect(depsOf(nodes).notify).toEqual([]);
    expect(depsOf(nodes).deploy).toEqual(['build', 'is-main:true']);
  });

  it('allows two needs on one node with two ports', () => {
    expect(hasRepeats([execNode('test'), merge('always', ['test', 'test:error'])])).toBe(false);
  });

  it('is a repeat when the node and the port come two times', () => {
    expect(hasRepeats([execNode('test'), merge('m', ['test:error', 'test:error'])])).toBe(true);
  });

  it('offers each port of a candidate: the cases of a switch, error on a node that runs a step', () => {
    expect(dependencyCandidates(pipeline, 'notify').map(textOf)).toEqual([
      'build',
      'build:error',
      'is-main',
      'is-main:true',
      'is-main:false',
      'deploy',
      'deploy:error',
    ]);
  });

  it('makes a dropped node wait for its target with no port', () => {
    expect(depsOf(moveNode(pipeline, 'notify', 'is-main', false)).notify).toEqual(['is-main']);
  });

  it('follows the rename of a node into the outputs that a switch reads', () => {
    const reads: PipelineNodeEntity = {
      ...ifNode('check', ['build']),
      cases: [
        {
          port: 'ok',
          combinator: 'any',
          rules: [
            {
              left: { kind: 'output', node: 'build', key: 'VERSION' },
              test: 'not_empty',
            },
          ],
        },
      ],
    };
    const { nodes } = renameNode([execNode('build'), reads], 'build', 'compile');
    expect(nodes[1]).toMatchObject({
      cases: [{ rules: [{ left: { kind: 'output', node: 'compile', key: 'VERSION' } }] }],
    });
  });
});

describe('nodeIssues', () => {
  it('refuses a need on a port that its node does not have', () => {
    const issues = nodeIssues([
      ifNode('is-main'),
      execNode('build'),
      execNode('a', ['is-main:maybe']),
      execNode('b', ['build:true']),
      merge('m', ['a']),
      execNode('c', ['m:error']),
    ]);
    expect(issues.get('a')).toEqual({
      kind: 'need',
      issue: { kind: 'unknown-port', need: need('is-main:maybe') },
    });
    expect(issues.get('b')?.issue).toMatchObject({ kind: 'unknown-port' });
    expect(issues.get('c')?.issue).toMatchObject({ kind: 'unknown-port' });
    expect(issues.has('m')).toBe(false);
  });

  it('accepts the ports of a switch and the error port of a node that runs a step', () => {
    expect(
      nodeIssues([
        execNode('test'),
        ifNode('is-main', ['test']),
        execNode('deploy', ['is-main:true']),
        execNode('cleanup', ['is-main:false']),
        execNode('notify', ['test:error']),
        merge('always', ['test', 'test:error']),
      ]).size,
    ).toBe(0);
  });

  it('refuses an output of a node that does not run a step before the switch', () => {
    const readsOutput = (node: string): PipelineNodeEntity => ({
      ...ifNode('check', ['build']),
      cases: [
        {
          port: 'ok',
          combinator: 'all',
          rules: [{ left: { kind: 'output', node, key: 'KEY' }, test: 'not_empty' }],
        },
      ],
    });
    const base = [execNode('build'), execNode('later', ['check']), merge('m', ['build'])];

    expect(nodeIssues([...base, readsOutput('build')]).has('check')).toBe(false);
    for (const node of ['later', 'm', 'ghost'])
      expect(nodeIssues([...base, readsOutput(node)]).get('check')).toEqual({
        kind: 'switch',
        issue: { kind: 'output-node', port: 'ok', node },
      });
  });

  it('refuses a merge with no need', () => {
    expect(nodeIssues([merge('m', [])]).get('m')).toEqual({
      kind: 'need',
      issue: { kind: 'merge-without-needs' },
    });
  });
});

describe('pipelineIssue: switches and needs', () => {
  it('names each node whose switch or needs the server refuses', () => {
    expect(
      pipelineIssue({
        name: 'nightly',
        nodes: [ifNode('is-main'), execNode('a', ['is-main:maybe']), merge('m', [])],
      }),
    ).toEqual({ kind: 'nodes', ids: ['a', 'm'] });
  });

  it('lets a node that cannot run yet go to the server, as before', () => {
    expect(
      pipelineIssue({ name: 'nightly', nodes: [{ ...execNode('a'), command: '' }] }),
    ).toBeNull();
  });
});
