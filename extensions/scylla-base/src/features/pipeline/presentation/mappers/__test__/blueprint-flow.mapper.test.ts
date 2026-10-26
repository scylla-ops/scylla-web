// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { nodesToFlow, flowToNodes, nodeOf, START_NODE_ID } from '../blueprint-flow.mapper.ts';
import type {
  PipelineNodeEntity,
  ExecPipelineNodeEntity,
} from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';

const execNode = (id: string, deps: string[] = []): ExecPipelineNodeEntity => ({
  id,
  deps,
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
    expect(rebuilt.find(s => s.id === 'b')?.deps).toEqual(['a']);
  });

  it('never derives a dependency on the start node itself', () => {
    const { flowNodes, edges } = nodesToFlow([execNode('a')], 'p');
    const rebuilt = flowToNodes(flowNodes, edges);
    expect(rebuilt[0].deps).toEqual([]);
  });

  it('round-trips exec nodes through nodesToFlow -> flowToNodes unchanged', () => {
    const nodes: PipelineNodeEntity[] = [
      { id: 'a', deps: [], kind: 'exec', command: 'echo', args: ['hi'], env: [] },
      { id: 'b', deps: ['a'], kind: 'exec', command: 'ls', args: [], workingDir: '/tmp', env: [] },
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
