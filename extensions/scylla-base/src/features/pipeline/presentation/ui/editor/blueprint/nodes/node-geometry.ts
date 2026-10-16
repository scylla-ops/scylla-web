import type { XYPosition } from '@xyflow/svelte';
import { NODE_WIDTH } from '@base/features/pipeline/presentation/utils/blueprint-converter.ts';

/** A card as wide as the layout cell; the start node is narrower. `height`: with one preview line. */
export const DETAILED_NODE = { width: NODE_WIDTH, startWidth: 180, height: 86 } as const;

/** A square tile, centred over a column wide enough for the label under it. */
export const MINIMAL_NODE = { width: 140, tile: 64 } as const;

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
