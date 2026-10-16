import type { XYPosition, useConnection } from '@xyflow/svelte';

/** `@xyflow/svelte` does not export the type of its connection state. */
type ConnectionState = ReturnType<typeof useConnection>['current'];

/**
 * Where a link pulled from a step's output would create a step: the point of the pointer, while
 * it is over no node. Dropped there, the link opens the quick add menu, which puts the step at
 * this point. `null` for any other link.
 */
export const linkDropPoint = (connection: ConnectionState): XYPosition | null =>
  connection.inProgress && connection.fromHandle.type === 'source' && !connection.toNode
    ? connection.to
    : null;
