import type { XYPosition } from '@xyflow/svelte';
import type { CatalogEntry } from '@base/features/pipeline/presentation/utils/node-catalog.ts';

/** The canvas, as a palette drag sees it. Points are screen points. */
export interface DropTarget {
  contains: (client: XYPosition) => boolean;
  /** The position a step dropped at this point takes in the graph. */
  positionAt: (client: XYPosition) => XYPosition;
  drop: (entry: CatalogEntry, position: XYPosition) => void;
}

/**
 * A palette entry dragged with the pointer: the app draws it under the pointer, and the canvas
 * outlines where it lands (`spot`) while the pointer is over it.
 */
export const createPaletteDrag = () => {
  let entry = $state.raw<CatalogEntry | null>(null);
  let pointer = $state.raw<XYPosition | null>(null);
  // `null` while the pointer is outside the canvas.
  let spot = $state.raw<XYPosition | null>(null);
  let target: DropTarget | null = null;

  const move = (at: XYPosition) => {
    if (!entry) return;
    pointer = at;
    spot = target?.contains(at) ? target.positionAt(at) : null;
  };

  const end = () => {
    entry = null;
    pointer = null;
    spot = null;
  };

  return {
    get entry() {
      return entry;
    },
    /** The screen point the dragged icon is centred on. */
    get pointer() {
      return pointer;
    },
    /** The position of the node that a drop creates, in the graph. */
    get spot() {
      return spot;
    },

    /** The canvas registers itself; the returned function unregisters it. */
    setTarget(next: DropTarget) {
      target = next;
      return () => {
        if (target === next) target = null;
      };
    },

    start(next: CatalogEntry, at: XYPosition) {
      entry = next;
      move(at);
    },
    move,
    /** Drops on the canvas; released anywhere else, the drag adds nothing. */
    finish() {
      if (entry && spot) target?.drop(entry, spot);
      end();
    },
    cancel: end,
  };
};

export type PaletteDrag = ReturnType<typeof createPaletteDrag>;
