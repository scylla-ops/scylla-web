import type { XYPosition, useConnection } from '@xyflow/svelte';

/** The layout cell: wide enough for the widest node appearance. */
export const NODE_WIDTH = 220;

/** A card as wide as the layout cell; the start node is narrower. `height`: with one preview line. */
export const DETAILED_NODE = { width: NODE_WIDTH, startWidth: 180, height: 86 } as const;

/** A square tile, centred over a column wide enough for the label under it. */
export const MINIMAL_NODE = { width: 140, tile: 64 } as const;

/** The row of a port on a detailed node: its name, and its handle on the right side. */
export const PORT_ROW_HEIGHT = 20;

/** The ports of a minimal node, spread on the right side of its tile: a tile with many grows. */
export const minimalTileHeight = (ports: number) => Math.max(MINIMAL_NODE.tile, (ports + 1) * 16);

const minimalPortTop = (index: number, ports: number) =>
  ((index + 1) * minimalTileHeight(ports)) / (ports + 1);

/** A source handle of a minimal node: one port alone is in the middle of the side, as a plain output. */
export const minimalPortStyle = (index: number, ports: number) =>
  `right: ${(MINIMAL_NODE.width - MINIMAL_NODE.tile) / 2}px; top: ${minimalPortTop(index, ports)}px;`;

/** The name of a port, right of its handle. */
export const minimalPortLabelStyle = (index: number, ports: number) =>
  `left: ${(MINIMAL_NODE.width + MINIMAL_NODE.tile) / 2 + 7}px; top: ${minimalPortTop(index, ports)}px;`;

/** The handles of a minimal node sit on the sides of the tile, not of the column. */
export const minimalHandleStyle = (side: 'left' | 'right') =>
  `${side}: ${(MINIMAL_NODE.width - MINIMAL_NODE.tile) / 2}px; top: ${MINIMAL_NODE.tile / 2}px;`;

/**
 * The point of a node that lands on a drop point: the middle of the node, so the outline of a
 * drop is centred on the pointer and on the icon that the drag draws there.
 */
export const DETAILED_ANCHOR: XYPosition = {
  x: DETAILED_NODE.width / 2,
  y: DETAILED_NODE.height / 2,
};
export const MINIMAL_ANCHOR: XYPosition = { x: MINIMAL_NODE.width / 2, y: MINIMAL_NODE.tile / 2 };

/** The box a new node takes, from its position: what the canvas outlines before a drop. */
export interface NodeFootprint {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

export const DETAILED_FOOTPRINT: NodeFootprint = {
  x: 0,
  y: 0,
  width: DETAILED_NODE.width,
  height: DETAILED_NODE.height,
  radius: 10,
};
/** The tile only: the label under it is text, not a place. */
export const MINIMAL_FOOTPRINT: NodeFootprint = {
  x: (MINIMAL_NODE.width - MINIMAL_NODE.tile) / 2,
  y: 0,
  width: MINIMAL_NODE.tile,
  height: MINIMAL_NODE.tile,
  radius: 18,
};

/** `@xyflow/svelte` does not export the type of its connection state. */
type ConnectionState = ReturnType<typeof useConnection>['current'];

/**
 * Where a link pulled from a node's output would create a node: the point of the pointer, while
 * it is over no node. Dropped there, the link opens the quick add menu, which puts the node at
 * this point. `null` for any other link.
 */
export const linkDropPoint = (connection: ConnectionState): XYPosition | null =>
  connection.inProgress && connection.fromHandle.type === 'source' && !connection.toNode
    ? connection.to
    : null;
