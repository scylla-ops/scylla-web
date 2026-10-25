// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { stepsToFlow, flowToSteps, stepOf, START_NODE_ID } from '../blueprint-flow.mapper.ts';
import type {
  PipelineStepEntity,
  ExecPipelineStepEntity,
} from '@base/features/pipeline/domain/entities/pipeline-step.entity.ts';

const execStep = (id: string, deps: string[] = []): ExecPipelineStepEntity => ({
  id,
  deps,
  kind: 'exec',
  command: 'echo',
  args: [id],
  env: [],
});

describe('stepsToFlow: what it does not repair', () => {
  it('keeps every id as it is: a repeated step gets a key of its own, and is marked', () => {
    const steps: PipelineStepEntity[] = [execStep('a'), execStep('a'), execStep('b')];
    const { nodes } = stepsToFlow(steps, 'p');
    const stepNodes = nodes.filter(node => node.id !== START_NODE_ID);

    expect(stepNodes.map(node => node.id)).toEqual(['a', 'a#2', 'b']);
    expect(stepNodes.map(node => stepOf(node)?.id)).toEqual(['a', 'a', 'b']);
    expect(stepNodes.map(node => node.type === 'pipelineStep' && !!node.data.repeated)).toEqual([
      true,
      true,
      false,
    ]);
  });

  it('draws a dependency on a repeated id from the first step with it', () => {
    const steps: PipelineStepEntity[] = [
      execStep('build'),
      execStep('build'),
      execStep('test', ['build']),
    ];
    const { edges } = stepsToFlow(steps, 'p');
    expect(edges).toContainEqual(expect.objectContaining({ source: 'build', target: 'test' }));
  });

  it('draws no edge for a dependency on the step itself or on a step that does not exist', () => {
    const steps: PipelineStepEntity[] = [execStep('a', ['a', 'ghost'])];
    const { edges } = stepsToFlow(steps, 'p');
    expect(edges).toEqual([expect.objectContaining({ source: START_NODE_ID, target: 'a' })]);
  });

  it('gives a repeated step a place of its own', () => {
    const { nodes } = stepsToFlow([execStep('a'), execStep('a')], 'p');
    const [first, second] = nodes.filter(node => node.id !== START_NODE_ID);
    expect(first.position).not.toEqual(second.position);
  });
});

describe('stepsToFlow', () => {
  it('produces one start node plus one node per step', () => {
    const steps: PipelineStepEntity[] = [execStep('a'), execStep('b', ['a'])];
    const { nodes } = stepsToFlow(steps, 'my-pipeline');
    expect(nodes).toHaveLength(3);
    expect(nodes[0].id).toBe(START_NODE_ID);
    expect(nodes[0].data).toEqual({ name: 'my-pipeline' });
  });

  it('wires an edge from the start node to every root step (no deps)', () => {
    const steps: PipelineStepEntity[] = [execStep('a'), execStep('b')];
    const { edges } = stepsToFlow(steps, 'p');
    const fromStart = edges.filter(e => e.source === START_NODE_ID).map(e => e.target);
    expect(fromStart.sort()).toEqual(['a', 'b']);
  });

  it('wires a direct edge for each dependency, not from the start node', () => {
    const steps: PipelineStepEntity[] = [execStep('a'), execStep('b', ['a'])];
    const { edges } = stepsToFlow(steps, 'p');
    expect(edges).toContainEqual(expect.objectContaining({ source: 'a', target: 'b' }));
    expect(edges.some(e => e.source === START_NODE_ID && e.target === 'b')).toBe(false);
  });

  it('places steps at increasing depth (x position) the further they are from a root', () => {
    const steps: PipelineStepEntity[] = [execStep('a'), execStep('b', ['a']), execStep('c', ['b'])];
    const { nodes } = stepsToFlow(steps, 'p');
    const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
    expect(byId.a.position.x).toBeLessThan(byId.b.position.x);
    expect(byId.b.position.x).toBeLessThan(byId.c.position.x);
  });

  it('gives siblings at the same depth distinct y positions', () => {
    const steps: PipelineStepEntity[] = [execStep('a'), execStep('b', ['a']), execStep('c', ['a'])];
    const { nodes } = stepsToFlow(steps, 'p');
    const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
    expect(byId.b.position.y).not.toBe(byId.c.position.y);
  });

  it('handles an empty pipeline (just the start node, no edges)', () => {
    const { nodes, edges } = stepsToFlow([], 'empty');
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe(START_NODE_ID);
    expect(edges).toHaveLength(0);
  });
});

describe('stepOf', () => {
  it('unwraps a step node, and answers nothing for the start node', () => {
    const { nodes } = stepsToFlow([execStep('a')], 'p');
    const [start, step] = nodes;

    expect(stepOf(start)).toBeUndefined();
    expect(stepOf(step)).toMatchObject({ id: 'a', kind: 'exec' });
  });
});

describe('flowToSteps', () => {
  it('rebuilds steps from nodes and edges, ignoring the start node', () => {
    const { nodes, edges } = stepsToFlow([execStep('a'), execStep('b', ['a'])], 'p');
    const rebuilt = flowToSteps(nodes, edges);
    expect(rebuilt).toHaveLength(2);
    expect(rebuilt.find(s => s.id === 'b')?.deps).toEqual(['a']);
  });

  it('never derives a dependency on the start node itself', () => {
    const { nodes, edges } = stepsToFlow([execStep('a')], 'p');
    const rebuilt = flowToSteps(nodes, edges);
    expect(rebuilt[0].deps).toEqual([]);
  });

  it('round-trips exec steps through stepsToFlow -> flowToSteps unchanged', () => {
    const steps: PipelineStepEntity[] = [
      { id: 'a', deps: [], kind: 'exec', command: 'echo', args: ['hi'], env: [] },
      { id: 'b', deps: ['a'], kind: 'exec', command: 'ls', args: [], workingDir: '/tmp', env: [] },
    ];
    const { nodes, edges } = stepsToFlow(steps, 'p');
    expect(flowToSteps(nodes, edges)).toEqual(steps);
  });

  it('round-trips script steps through stepsToFlow -> flowToSteps unchanged', () => {
    const steps: PipelineStepEntity[] = [
      { id: 'build', deps: [], kind: 'script', script: 'echo hi', shell: 'bash', env: [] },
    ];
    const { nodes, edges } = stepsToFlow(steps, 'p');
    expect(flowToSteps(nodes, edges)).toEqual(steps);
  });
});

describe('a loop of dependencies', () => {
  // `a` and `b` wait for each other; a root reaches the loop. Only a document typed by hand holds one.
  const loop = [execStep('root'), execStep('a', ['root', 'b']), execStep('b', ['a'])];

  it('is laid out, and the layout ends', () => {
    const { nodes } = stepsToFlow(loop, 'p');
    expect(nodes.map(node => node.id).sort()).toEqual([START_NODE_ID, 'a', 'b', 'root'].sort());
  });
});
