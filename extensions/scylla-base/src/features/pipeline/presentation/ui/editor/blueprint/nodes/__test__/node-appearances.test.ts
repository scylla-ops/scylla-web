import { describe, it, expect } from 'vitest';
import { NODE_APPEARANCES } from '@base/features/pipeline/presentation/node-appearance.svelte.ts';
import { NODE_APPEARANCE_VIEWS, nodePositionAt } from '../node-appearances.ts';
import { MINIMAL_NODE } from '../node-geometry.ts';

describe('nodePositionAt', () => {
  it('lands the icon of a minimal node on the point, not its corner', () => {
    expect(nodePositionAt('minimal', { x: 500, y: 300 })).toEqual({
      x: 500 - MINIMAL_NODE.width / 2,
      y: 300 - MINIMAL_NODE.tile / 2,
    });
  });

  it('gives every style a view of a step, a view of the start node and an anchor', () => {
    for (const appearance of NODE_APPEARANCES) {
      const view = NODE_APPEARANCE_VIEWS[appearance];
      expect([view.step, view.start, view.anchor]).not.toContain(undefined);
    }
  });
});
