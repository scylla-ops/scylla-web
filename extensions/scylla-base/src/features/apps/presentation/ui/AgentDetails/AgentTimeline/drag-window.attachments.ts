import type { Attachment } from 'svelte/attachments';
import type { TimelineWindow, WindowPart } from './timeline-window.state.svelte.ts';

/** Shift with an arrow moves a week. */
const WEEK = 7;

const KEY_DAYS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowDown: -1,
  ArrowRight: 1,
  ArrowUp: 1,
};

/**
 * A drag of the window or of one of its edges, and the arrows on an edge. The part captures the
 * pointer, so that the drag follows it out of the strip. `daysFor` turns pixels into days.
 */
export const dragWindow =
  (
    part: WindowPart,
    timeline: TimelineWindow,
    daysFor: (pixels: number) => number,
  ): Attachment<HTMLElement> =>
  node => {
    let origin: number | null = null;

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !event.isPrimary) return;
      event.stopPropagation();
      event.preventDefault();
      origin = event.clientX;
      node.setPointerCapture(event.pointerId);
      timeline.begin();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (origin !== null) timeline.drag(part, daysFor(event.clientX - origin));
    };

    const onDragEnd = () => {
      if (origin === null) return;
      origin = null;
      timeline.end();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const days = KEY_DAYS[event.key];
      if (part === 'move' || days === undefined) return;
      event.preventDefault();
      timeline.step(part, days * (event.shiftKey ? WEEK : 1));
    };

    node.addEventListener('pointerdown', onPointerDown);
    node.addEventListener('pointermove', onPointerMove);
    node.addEventListener('pointerup', onDragEnd);
    node.addEventListener('pointercancel', onDragEnd);
    node.addEventListener('lostpointercapture', onDragEnd);
    node.addEventListener('keydown', onKeyDown);

    return () => {
      onDragEnd();
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerup', onDragEnd);
      node.removeEventListener('pointercancel', onDragEnd);
      node.removeEventListener('lostpointercapture', onDragEnd);
      node.removeEventListener('keydown', onKeyDown);
    };
  };
