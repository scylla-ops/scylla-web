// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { flushSync } from 'svelte';
import { createDropSpot, type DropSpot } from '../drop-spot.state.svelte.ts';

const withSpot = (run: (spot: DropSpot) => void) => {
  const cleanup = $effect.root(() => run(createDropSpot()));
  cleanup();
};

describe('createDropSpot', () => {
  it('shows where the node would land while the drag moves over the canvas', () => {
    withSpot(spot => {
      spot.enter();
      spot.move({ x: 40, y: 80 });
      flushSync();
      expect(spot.position).toEqual({ x: 40, y: 80 });
    });
  });

  it('stays while the pointer moves from the canvas onto one of its children', () => {
    withSpot(spot => {
      spot.enter();
      spot.move({ x: 40, y: 80 });
      // Onto a node: the browser enters the child, then leaves the canvas.
      spot.enter();
      spot.leave();
      flushSync();
      expect(spot.position).toEqual({ x: 40, y: 80 });
    });
  });

  it('goes when the drag leaves the canvas, and when it drops', () => {
    withSpot(spot => {
      spot.enter();
      spot.move({ x: 40, y: 80 });
      spot.leave();
      flushSync();
      expect(spot.position).toBeNull();

      spot.enter();
      spot.enter();
      spot.move({ x: 0, y: 0 });
      spot.clear();
      flushSync();
      expect(spot.position).toBeNull();

      // A count left by the drop does not keep the next drag alive.
      spot.enter();
      spot.move({ x: 0, y: 0 });
      spot.leave();
      expect(spot.position).toBeNull();
    });
  });
});
