import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  START_NODE_ID,
  type FlowNode,
} from '@base/features/pipeline/presentation/mappers/blueprint-flow.mapper.ts';
import { createNodePlaces } from '../node-places.state.svelte.ts';

const flowNode = (id: string, x = 0, y = 0) =>
  ({ id, type: id === START_NODE_ID ? 'startNode' : 'pipelineNode', position: { x, y }, data: {} }) as FlowNode;

const placesWith = (saved: string[]) => {
  const save = vi.fn();
  return { save, places: createNodePlaces({ savedIds: () => saved, save }) };
};

beforeEach(() => vi.useFakeTimers());

afterEach(() => vi.useRealTimers());

describe('the end of a drag', () => {
  it('saves a saved node after 500 ms, and not before', () => {
    const { save, places } = placesWith(['build']);

    places.moved([flowNode('build', 10, 20)]);
    vi.advanceTimersByTime(499);
    expect(save).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(save).toHaveBeenCalledWith({ nodes: { build: { x: 10, y: 20 } } });
  });

  it('sends one request for a row of drags, with the last place of each node', () => {
    const { save, places } = placesWith(['build', 'test']);

    places.moved([flowNode('build', 1, 1)]);
    vi.advanceTimersByTime(300);
    places.moved([flowNode('test', 2, 2)]);
    vi.advanceTimersByTime(300);
    places.moved([flowNode('build', 3, 3)]);
    vi.advanceTimersByTime(500);

    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith({
      nodes: { build: { x: 3, y: 3 }, test: { x: 2, y: 2 } },
    });
  });

  it('saves the place of the start node apart', () => {
    const { save, places } = placesWith(['build']);

    places.moved([flowNode(START_NODE_ID, 7, 8)]);
    vi.advanceTimersByTime(500);

    expect(save).toHaveBeenCalledWith({ start: { x: 7, y: 8 }, nodes: {} });
  });

  it('sends no request for a node that the server does not hold', () => {
    const { save, places } = placesWith(['build']);

    places.moved([flowNode('new-node', 1, 2)]);
    vi.advanceTimersByTime(500);

    expect(save).not.toHaveBeenCalled();
  });

  it('does not send a place two times', () => {
    const { save, places } = placesWith(['build']);

    places.moved([flowNode('build', 1, 2)]);
    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(1000);

    expect(save).toHaveBeenCalledOnce();
  });
});

describe('the save of the pipeline', () => {
  it('takes the places of the nodes that the server does not hold', () => {
    const { places } = placesWith(['build']);
    places.connect(() => [
      flowNode(START_NODE_ID, 1, 1),
      flowNode('build', 2, 2),
      flowNode('renamed', 3, 3),
    ]);

    expect(places.waiting()).toEqual({ nodes: { renamed: { x: 3, y: 3 } } });
  });

  it('takes the whole graph of a new pipeline, with the start node', () => {
    const { places } = placesWith([]);
    places.connect(() => [flowNode(START_NODE_ID, 1, 1), flowNode('build', 2, 2)]);

    expect(places.waiting()).toEqual({ start: { x: 1, y: 1 }, nodes: { build: { x: 2, y: 2 } } });
  });

  it('gives nothing when each node is saved', () => {
    const { places } = placesWith(['build']);
    places.connect(() => [flowNode(START_NODE_ID, 1, 1), flowNode('build', 2, 2)]);

    expect(places.waiting()).toBeUndefined();
  });
});
