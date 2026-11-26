/** The shape of a ghost item: the shape of the items around it. */
export type GhostItemShape = 'card' | 'row' | 'tile';

export const GHOST_ITEM_SHAPES: Record<GhostItemShape, string> = {
  card: 'h-full min-h-40 flex-col rounded-xl',
  row: 'h-12 rounded-lg',
  tile: 'h-full min-h-28 flex-col rounded-xl',
};
