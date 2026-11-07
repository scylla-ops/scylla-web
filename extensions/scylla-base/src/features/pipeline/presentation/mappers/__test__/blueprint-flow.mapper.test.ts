// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { nodesToFlow, flowToNodes, nodeOf, placesOf, START_NODE_ID } from '../blueprint-flow.mapper.ts';
import type {
  PipelineNodeEntity,
  ExecPipelineNodeEntity,
  SwitchPipelineNodeEntity,
} from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';

/** `is-main:true` is a need on the port `true` of `is-main`. */
const needs = (texts: string[]) =>
  texts.map(text => {
    const [node, port] = text.split(':');
    return port ? { node, port } : { node };
  });

const execNode = (id: string, deps: string[] = []): ExecPipelineNodeEntity => ({
  id,
  deps: needs(deps),
  kind: 'exec',
  command: 'echo',
  args: [id],
  env: [],
});

describe('nodesToFlow: what it does not repair', () => {
  it('keeps every id as it is: a repeated node gets a key of its own, and is marked', () => {
    const nodes: PipelineNodeEntity[] = [execNode('a'), execNode('a'), execNode('b')];
    const { flowNodes } = nodesToFlow(nodes, 'p');
    const pipelineFlowNodes = flowNodes.filter(flowNode => flowNode.id !== START_NODE_ID);

    expect(pipelineFlowNodes.map(flowNode => flowNode.id)).toEqual(['a', 'a#2', 'b']);
    expect(pipelineFlowNodes.map(flowNode => nodeOf(flowNode)?.id)).toEqual(['a', 'a', 'b']);
    expect(
      pipelineFlowNodes.map(
        flowNode => flowNode.type === 'pipelineNode' && !!flowNode.data.repeated,
      ),
    ).toEqual([true, true, false]);
  });

  it('draws a dependency on a repeated id from the first node with it', () => {
    const nodes: PipelineNodeEntity[] = [
      execNode('build'),
      execNode('build'),
      execNode('test', ['build']),
    ];
    const { edges } = nodesToFlow(nodes, 'p');
    expect(edges).toContainEqual(expect.objectContaining({ source: 'build', target: 'test' }));
  });

  it('draws no edge for a dependency on the node itself or on a node that does not exist', () => {
    const nodes: PipelineNodeEntity[] = [execNode('a', ['a', 'ghost'])];
    const { edges } = nodesToFlow(nodes, 'p');
    expect(edges).toEqual([expect.objectContaining({ source: START_NODE_ID, target: 'a' })]);
  });

  it('gives a repeated node a place of its own', () => {
    const { flowNodes } = nodesToFlow([execNode('a'), execNode('a')], 'p');
    const [first, second] = flowNodes.filter(flowNode => flowNode.id !== START_NODE_ID);
    expect(first.position).not.toEqual(second.position);
  });
});

describe('nodesToFlow', () => {
  it('produces one start node plus one node per node', () => {
    const nodes: PipelineNodeEntity[] = [execNode('a'), execNode('b', ['a'])];
    const { flowNodes } = nodesToFlow(nodes, 'my-pipeline');
    expect(flowNodes).toHaveLength(3);
    expect(flowNodes[0].id).toBe(START_NODE_ID);
    expect(flowNodes[0].data).toEqual({ name: 'my-pipeline' });
  });

  it('wires an edge from the start node to every root node (no deps)', () => {
    const nodes: PipelineNodeEntity[] = [execNode('a'), execNode('b')];
    const { edges } = nodesToFlow(nodes, 'p');
    const fromStart = edges.filter(e => e.source === START_NODE_ID).map(e => e.target);
    expect(fromStart.sort()).toEqual(['a', 'b']);
  });

  it('wires a direct edge for each dependency, not from the start node', () => {
    const nodes: PipelineNodeEntity[] = [execNode('a'), execNode('b', ['a'])];
    const { edges } = nodesToFlow(nodes, 'p');
    expect(edges).toContainEqual(expect.objectContaining({ source: 'a', target: 'b' }));
    expect(edges.some(e => e.source === START_NODE_ID && e.target === 'b')).toBe(false);
  });

  it('places nodes at increasing depth (x position) the further they are from a root', () => {
    const nodes: PipelineNodeEntity[] = [execNode('a'), execNode('b', ['a']), execNode('c', ['b'])];
    const { flowNodes } = nodesToFlow(nodes, 'p');
    const byId = Object.fromEntries(flowNodes.map(n => [n.id, n]));
    expect(byId.a.position.x).toBeLessThan(byId.b.position.x);
    expect(byId.b.position.x).toBeLessThan(byId.c.position.x);
  });

  it('gives siblings at the same depth distinct y positions', () => {
    const nodes: PipelineNodeEntity[] = [execNode('a'), execNode('b', ['a']), execNode('c', ['a'])];
    const { flowNodes } = nodesToFlow(nodes, 'p');
    const byId = Object.fromEntries(flowNodes.map(n => [n.id, n]));
    expect(byId.b.position.y).not.toBe(byId.c.position.y);
  });

  it('handles an empty pipeline (just the start node, no edges)', () => {
    const { flowNodes, edges } = nodesToFlow([], 'empty');
    expect(flowNodes).toHaveLength(1);
    expect(flowNodes[0].id).toBe(START_NODE_ID);
    expect(edges).toHaveLength(0);
  });
});

describe('nodeOf', () => {
  it('unwraps the node of a pipeline flow node, and answers nothing for the start node', () => {
    const { flowNodes } = nodesToFlow([execNode('a')], 'p');
    const [start, node] = flowNodes;

    expect(nodeOf(start)).toBeUndefined();
    expect(nodeOf(node)).toMatchObject({ id: 'a', kind: 'exec' });
  });
});

describe('flowToNodes', () => {
  it('rebuilds nodes from nodes and edges, ignoring the start node', () => {
    const { flowNodes, edges } = nodesToFlow([execNode('a'), execNode('b', ['a'])], 'p');
    const rebuilt = flowToNodes(flowNodes, edges);
    expect(rebuilt).toHaveLength(2);
    expect(rebuilt.find(s => s.id === 'b')?.deps).toEqual([{ node: 'a' }]);
  });

  it('never derives a dependency on the start node itself', () => {
    const { flowNodes, edges } = nodesToFlow([execNode('a')], 'p');
    const rebuilt = flowToNodes(flowNodes, edges);
    expect(rebuilt[0].deps).toEqual([]);
  });

  it('round-trips exec nodes through nodesToFlow -> flowToNodes unchanged', () => {
    const nodes: PipelineNodeEntity[] = [
      { id: 'a', deps: [], kind: 'exec', command: 'echo', args: ['hi'], env: [] },
      {
        id: 'b',
        deps: [{ node: 'a' }],
        kind: 'exec',
        command: 'ls',
        args: [],
        workingDir: '/tmp',
        env: [],
      },
    ];
    const { flowNodes, edges } = nodesToFlow(nodes, 'p');
    expect(flowToNodes(flowNodes, edges)).toEqual(nodes);
  });

  it('round-trips script nodes through nodesToFlow -> flowToNodes unchanged', () => {
    const nodes: PipelineNodeEntity[] = [
      { id: 'build', deps: [], kind: 'script', script: 'echo hi', shell: 'bash', env: [] },
    ];
    const { flowNodes, edges } = nodesToFlow(nodes, 'p');
    expect(flowToNodes(flowNodes, edges)).toEqual(nodes);
  });
});

describe('a loop of dependencies', () => {
  // `a` and `b` wait for each other; a root reaches the loop. Only a document typed by hand holds one.
  const loop = [execNode('root'), execNode('a', ['root', 'b']), execNode('b', ['a'])];

  it('is laid out, and the layout ends', () => {
    const { flowNodes } = nodesToFlow(loop, 'p');
    expect(flowNodes.map(flowNode => flowNode.id).sort()).toEqual(
      [START_NODE_ID, 'a', 'b', 'root'].sort(),
    );
  });
});

describe('the ports', () => {
  const ifNode = (id: string, deps: string[] = []): SwitchPipelineNodeEntity => ({
    id,
    deps: needs(deps),
    env: [],
    kind: 'switch',
    cases: [
      {
        port: 'true',
        combinator: 'all',
        rules: [{ left: { kind: 'var', name: 'A' }, test: 'not_empty' }],
      },
    ],
    otherwise: 'false',
    allMatches: false,
  });
  const nodes: PipelineNodeEntity[] = [
    execNode('build'),
    ifNode('is-main', ['build']),
    execNode('cleanup', ['is-main:false']),
    execNode('deploy', ['build', 'is-main:true']),
    execNode('notify', ['build:error']),
  ];

  it('draws an edge from a port from its handle, with the port in its id', () => {
    const { edges } = nodesToFlow(nodes, 'p');
    expect(edges).toContainEqual(
      expect.objectContaining({
        id: 'is-main:true->deploy',
        source: 'is-main',
        sourceHandle: 'true',
        target: 'deploy',
      }),
    );
    expect(edges).toContainEqual(
      expect.objectContaining({ id: 'build->deploy', source: 'build', target: 'deploy' }),
    );
    expect(edges.find(edge => edge.id === 'build->deploy')).not.toHaveProperty('sourceHandle');
  });

  it('reads the handle of each edge back into the port of the need', () => {
    const { flowNodes, edges } = nodesToFlow(nodes, 'p');
    expect(flowToNodes(flowNodes, edges)).toEqual(nodes);
  });

  it('keeps a need on a port that its node does not have', () => {
    const odd = [execNode('build'), execNode('deploy', ['build:true'])];
    const { flowNodes, edges } = nodesToFlow(odd, 'p');
    expect(flowToNodes(flowNodes, edges)).toEqual(odd);
  });

  it('puts the targets of a switch in the order of its ports', () => {
    const { flowNodes } = nodesToFlow(nodes, 'p');
    const byId = Object.fromEntries(flowNodes.map(n => [n.id, n]));
    expect(byId.deploy.position.x).toBe(byId.cleanup.position.x);
    expect(byId.deploy.position.y).toBeLessThan(byId.cleanup.position.y);
  });

  it('keeps the handle of each edge with a saved layout, and gives a switch and a merge their places', () => {
    const join: PipelineNodeEntity = { id: 'join', deps: needs(['cleanup', 'deploy:error']), kind: 'merge' };
    const saved = { nodes: { 'is-main': { x: 10, y: 20 }, join: { x: 30, y: 40 } } };
    const { flowNodes, edges } = nodesToFlow([...nodes, join], 'p', saved);
    const at = Object.fromEntries(flowNodes.map(n => [n.id, n.position]));

    expect(at['is-main']).toEqual({ x: 10, y: 20 });
    expect(at.join).toEqual({ x: 30, y: 40 });
    expect(edges).toContainEqual(
      expect.objectContaining({ id: 'deploy:error->join', sourceHandle: 'error' }),
    );
    expect(flowToNodes(flowNodes, edges)).toEqual([...nodes, join]);
    expect(placesOf(flowNodes).nodes).toContainEqual(['join', { x: 30, y: 40 }]);
  });

  it('gives a switch with many ports the room of its rows', () => {
    const wide: PipelineNodeEntity = {
      ...ifNode('pick'),
      cases: ['a', 'b', 'c', 'd', 'e'].map(port => ({ port, combinator: 'all', rules: [] })),
    };
    const { flowNodes } = nodesToFlow([wide, execNode('next')], 'p');
    const byId = Object.fromEntries(flowNodes.map(n => [n.id, n]));
    // 112 for the cell, 20 for each port past two (6 ports), 40 between two nodes.
    expect(byId.next.position.y - byId.pick.position.y).toBe(112 + 4 * 20 + 40);
  });
});

describe('saved places', () => {
  const nodes = [execNode('build'), execNode('test', ['build'])];
  const placeOf = (flowNodes: ReturnType<typeof nodesToFlow>['flowNodes'], id: string) =>
    flowNodes.find(flowNode => flowNode.id === id)?.position;

  it('go before the automatic places, for the nodes and for the start node', () => {
    const { flowNodes } = nodesToFlow(nodes, 'p', {
      start: { x: -5, y: -6 },
      nodes: { build: { x: 700, y: 800 } },
    });

    expect(placeOf(flowNodes, START_NODE_ID)).toEqual({ x: -5, y: -6 });
    expect(placeOf(flowNodes, 'build')).toEqual({ x: 700, y: 800 });
  });

  it('leave a node with no saved place on its automatic place', () => {
    const automatic = nodesToFlow(nodes, 'p').flowNodes;
    const { flowNodes } = nodesToFlow(nodes, 'p', { nodes: { build: { x: 700, y: 800 } } });

    expect(placeOf(flowNodes, 'test')).toEqual(placeOf(automatic, 'test'));
  });

  it('give the same graph as no layout when nothing is saved', () => {
    expect(nodesToFlow(nodes, 'p', null)).toEqual(nodesToFlow(nodes, 'p'));
  });

  it('read the graph back as whole pixels, with the start node apart', () => {
    const { flowNodes } = nodesToFlow([execNode('build')], 'p', {
      start: { x: 1.2, y: 2.7 },
      nodes: { build: { x: 3.5, y: 4 } },
    });

    expect(placesOf(flowNodes)).toEqual({
      start: { x: 1, y: 3 },
      nodes: [['build', { x: 4, y: 4 }]],
    });
  });
});
