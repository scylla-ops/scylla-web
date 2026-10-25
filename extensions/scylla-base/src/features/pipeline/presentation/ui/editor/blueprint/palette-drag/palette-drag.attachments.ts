import { untrack } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import type { XYPosition } from '@xyflow/svelte';
import type { CatalogEntry } from '@base/features/pipeline/presentation/presenters/catalog.presenter.ts';
import type { DropTarget, PaletteDrag } from './palette-drag.state.svelte.ts';

/** How far the pointer moves before a press on a row becomes a drag, not a click. */
const DRAG_THRESHOLD = 4;

/** On `<html>` during a drag: no pointer anywhere, the dragged icon takes its place. */
const HIDE_POINTER = ['cursor-none', '[&_*]:cursor-none!'];

const pointOf = (event: PointerEvent): XYPosition => ({ x: event.clientX, y: event.clientY });

/**
 * Drags a palette row with the pointer. The row captures the pointer, so it follows it over the
 * canvas. The click that ends a drag, and a drag that Escape cancels, add nothing.
 */
export const dragToCanvas =
  (options: () => { entry: CatalogEntry; drag: PaletteDrag }): Attachment<HTMLElement> =>
  node => {
    const { entry, drag } = untrack(options);
    const root = node.ownerDocument.documentElement;
    let origin: XYPosition | null = null;
    let dragging = false;
    let swallowClick = false;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      drag.cancel();
      stop();
    };

    function stop() {
      origin = null;
      if (!dragging) return;
      dragging = false;
      swallowClick = true;
      root.classList.remove(...HIDE_POINTER);
      window.removeEventListener('keydown', onKeyDown);
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !event.isPrimary) return;
      swallowClick = false;
      origin = pointOf(event);
      node.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!origin) return;
      const at = pointOf(event);
      if (dragging) {
        drag.move(at);
        return;
      }
      if (Math.hypot(at.x - origin.x, at.y - origin.y) < DRAG_THRESHOLD) return;

      dragging = true;
      root.classList.add(...HIDE_POINTER);
      window.addEventListener('keydown', onKeyDown);
      drag.start(entry, at);
    };

    const onPointerUp = () => {
      if (dragging) drag.finish();
      stop();
    };

    const onPointerCancel = () => {
      if (dragging) drag.cancel();
      stop();
    };

    const onClick = (event: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    node.addEventListener('pointerdown', onPointerDown);
    node.addEventListener('pointermove', onPointerMove);
    node.addEventListener('pointerup', onPointerUp);
    node.addEventListener('pointercancel', onPointerCancel);
    node.addEventListener('lostpointercapture', onPointerCancel);
    node.addEventListener('click', onClick, { capture: true });

    return () => {
      if (dragging) drag.cancel();
      stop();
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerup', onPointerUp);
      node.removeEventListener('pointercancel', onPointerCancel);
      node.removeEventListener('lostpointercapture', onPointerCancel);
      node.removeEventListener('click', onClick, { capture: true });
    };
  };

/** Makes an element the place where a palette drag drops: its box is the canvas. */
export const acceptPaletteDrop =
  (options: () => { drag: PaletteDrag } & Omit<DropTarget, 'contains'>): Attachment<HTMLElement> =>
  node => {
    const { drag } = untrack(options);
    return drag.setTarget({
      contains: ({ x, y }) => {
        const box = node.getBoundingClientRect();
        return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
      },
      // Read at call time: the canvas's callbacks may change.
      positionAt: client => options().positionAt(client),
      drop: (entry, position) => options().drop(entry, position),
    });
  };
