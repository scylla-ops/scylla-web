import type { XYPosition } from '@xyflow/svelte';

/**
 * Where a palette entry dragged over the canvas would land. The browser sends `dragleave` each
 * time the pointer moves onto a child: a count of entries tells a real exit.
 */
export const createDropSpot = () => {
  let position = $state.raw<XYPosition | null>(null);
  let depth = 0;

  return {
    /** The position of the node that a drop creates, in the graph. */
    get position() {
      return position;
    },
    enter() {
      depth += 1;
    },
    leave() {
      depth = Math.max(0, depth - 1);
      if (depth === 0) position = null;
    },
    move(next: XYPosition) {
      if (position?.x !== next.x || position.y !== next.y) position = next;
    },
    clear() {
      depth = 0;
      position = null;
    },
  };
};

export type DropSpot = ReturnType<typeof createDropSpot>;
