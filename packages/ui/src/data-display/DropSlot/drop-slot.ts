/** The shape of a drop slot: the shape of the item that goes there. */
export type DropSlotShape = 'card' | 'row' | 'header' | 'tile';

export const DROP_SLOT_SHAPES: Record<DropSlotShape, string> = {
  card: 'h-full min-h-24 rounded-xl',
  row: 'h-12 rounded-lg',
  header: 'h-10 rounded-lg',
  tile: 'h-full min-h-28 rounded-xl',
};
