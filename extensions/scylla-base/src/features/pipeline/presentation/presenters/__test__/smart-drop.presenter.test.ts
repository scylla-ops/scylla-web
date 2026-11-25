import { describe, it, expect } from 'vitest';
import { START_NODE_ID } from '@base/features/pipeline/presentation/mappers/blueprint-flow.mapper.ts';
import {
  linkForDrop,
  nearestBefore,
  previewEdges,
  type DropNode,
} from '../smart-drop.presenter.ts';

const box = (id: string, x: number, y: number): DropNode => ({ id, x, y, width: 200, height: 80 });

const nodes = [box(START_NODE_ID, 0, 0), box('build', 300, 0), box('test', 600, 0), box('lint', 300, 300)];

describe('nearestBefore', () => {
  it('picks the closest node on the left of the point', () => {
    expect(nearestBefore(nodes, { x: 1000, y: 40 }, START_NODE_ID)).toBe('test');
    expect(nearestBefore(nodes, { x: 700, y: 330 }, START_NODE_ID)).toBe('lint');
  });

  it('ignores a node that is on the right of the point', () => {
    expect(nearestBefore(nodes, { x: 450, y: 40 }, START_NODE_ID)).toBe('build');
  });

  it('falls back to the start node when nothing is before the point', () => {
    expect(nearestBefore([box('build', 300, 0)], { x: 100, y: 0 }, START_NODE_ID)).toBe(START_NODE_ID);
  });
});

describe('linkForDrop', () => {
  const base = { nodes, startId: START_NODE_ID, point: { x: 1000, y: 40 } };

  it('connects after the nearest node', () => {
    expect(linkForDrop(base)).toEqual({ after: 'test' });
  });

  it('inserts into the edge under the point', () => {
    expect(linkForDrop({ ...base, edgeId: 'e1' })).toEqual({ replacing: 'e1' });
  });

  it('connects to nothing with the modifier key, even over an edge', () => {
    expect(linkForDrop({ ...base, detached: true })).toBeNull();
    expect(linkForDrop({ ...base, edgeId: 'e1', detached: true })).toBeNull();
  });
});

describe('previewEdges', () => {
  const spot = box('new', 450, 0);
  const edges = [{ id: 'e1', source: 'build', target: 'test' }];
  const input = { appearance: 'detailed' as const, nodes, edges, spot };

  it('draws one edge from the node that the drop connects to', () => {
    expect(previewEdges({ ...input, link: { after: 'build' } })).toEqual([
      { from: { x: 500, y: 40 }, to: { x: 450, y: 40 } },
    ]);
  });

  it('draws two edges for an insert, and none with no connection', () => {
    expect(previewEdges({ ...input, link: { replacing: 'e1' } })).toHaveLength(2);
    expect(previewEdges({ ...input, link: null })).toEqual([]);
  });
});
