import type { XYPosition } from '@xyflow/svelte';
import { NODE_WIDTH } from '@base/features/pipeline/presentation/utils/blueprint-converter.ts';

/** A card as wide as the layout cell; the start node is narrower. */
export const DETAILED_NODE = { width: NODE_WIDTH, startWidth: 180 } as const;

/** A square tile, centred over a column wide enough for the label under it. */
export const MINIMAL_NODE = { width: 140, tile: 64 } as const;

/** The handles of a minimal node sit on the sides of the tile, not of the column. */
export const minimalHandleStyle = (side: 'left' | 'right') =>
  `${side}: ${(MINIMAL_NODE.width - MINIMAL_NODE.tile) / 2}px; top: ${MINIMAL_NODE.tile / 2}px;`;

/** The point of a node that lands on a drop point: the middle of its icon. */
export const DETAILED_ANCHOR: XYPosition = {
  x: DETAILED_NODE.width / 2,
  // The card's `p-3` plus half of its `size-7` icon.
  y: 12 + 28 / 2,
};
export const MINIMAL_ANCHOR: XYPosition = { x: MINIMAL_NODE.width / 2, y: MINIMAL_NODE.tile / 2 };
