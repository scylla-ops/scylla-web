/** The edge that holds the handle: `start` for a panel docked on the right, `end` on the left. */
export type ResizeEdge = 'start' | 'end';

export interface WidthBounds {
  min: number;
  max: number;
}

/** What one arrow key press moves the handle by, in pixels. */
export const RESIZE_KEY_STEP = 16;

export const clampWidth = (width: number, { min, max }: WidthBounds): number =>
  Math.min(max, Math.max(min, Math.round(width)));

/** The handle follows the pointer: on the start edge, moving left makes the panel wider. */
export const widthAfterDrag = (
  startWidth: number,
  deltaX: number,
  edge: ResizeEdge,
  bounds: WidthBounds,
): number => clampWidth(startWidth + (edge === 'start' ? -deltaX : deltaX), bounds);

/** The keys of a window splitter; `null` for any other key. */
export const widthAfterKey = (
  width: number,
  key: string,
  edge: ResizeEdge,
  bounds: WidthBounds,
): number | null => {
  switch (key) {
    case 'ArrowLeft':
      return widthAfterDrag(width, -RESIZE_KEY_STEP, edge, bounds);
    case 'ArrowRight':
      return widthAfterDrag(width, RESIZE_KEY_STEP, edge, bounds);
    case 'Home':
      return bounds.min;
    case 'End':
      return bounds.max;
    default:
      return null;
  }
};
