import type { XYPosition, useConnection } from '@xyflow/svelte';

/** `@xyflow/svelte` does not export the type of its connection state. */
type ConnectionState = ReturnType<typeof useConnection>['current'];

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

/**
 * Where a link pulled from a step's output would create a step: the point of the pointer, while
 * it is over no node. Dropped there, the link opens the quick add menu, which puts the step at
 * this point. `null` for any other link.
 */
export const linkDropPoint = (connection: ConnectionState): XYPosition | null =>
  connection.inProgress && connection.fromHandle.type === 'source' && !connection.toNode
    ? connection.to
    : null;
