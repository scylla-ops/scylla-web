import { describe, it, expect } from 'vitest';
import { NODE_APPEARANCES } from '@base/features/pipeline/presentation/ui/editor/blueprint/canvas/node-appearance-preference.state.svelte.ts';
import { NODE_APPEARANCE_VIEWS, nodePositionAt } from '../node-appearances.registry.ts';
import { MINIMAL_NODE } from '@base/features/pipeline/presentation/presenters/blueprint-geometry.presenter.ts';

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

  it('gives every style the box a dropped node takes, around the point it lands on', () => {
    for (const appearance of NODE_APPEARANCES) {
      const { anchor, footprint } = NODE_APPEARANCE_VIEWS[appearance];
      expect(footprint.width).toBeGreaterThan(0);
      expect(footprint.height).toBeGreaterThan(0);
      // The drop point (the anchor) is inside the outlined box.
      expect(anchor.x).toBeGreaterThanOrEqual(footprint.x);
      expect(anchor.x).toBeLessThanOrEqual(footprint.x + footprint.width);
      expect(anchor.y).toBeGreaterThanOrEqual(footprint.y);
      expect(anchor.y).toBeLessThanOrEqual(footprint.y + footprint.height);
    }
  });

  it('centres the box of a dropped node on the drop point, so the dragged icon is in its middle', () => {
    for (const appearance of NODE_APPEARANCES) {
      const { anchor, footprint } = NODE_APPEARANCE_VIEWS[appearance];
      expect(anchor).toEqual({
        x: footprint.x + footprint.width / 2,
        y: footprint.y + footprint.height / 2,
      });
    }
  });
});
