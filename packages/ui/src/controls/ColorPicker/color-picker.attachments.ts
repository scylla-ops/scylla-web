import type { Attachment } from 'svelte/attachments';

const clamp = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Follows a press and a drag of the pointer on an element, and gives the point as fractions of
 * its width and height (0 to 1). The element keeps the pointer until the release.
 */
export const trackPointer =
  (onpoint: (x: number, y: number) => void): Attachment<HTMLElement> =>
  element => {
    const report = (event: PointerEvent) => {
      const box = element.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return;
      onpoint(
        clamp((event.clientX - box.left) / box.width),
        clamp((event.clientY - box.top) / box.height),
      );
    };
    const press = (event: PointerEvent) => {
      if (event.button !== 0) return;
      element.setPointerCapture(event.pointerId);
      report(event);
    };
    const drag = (event: PointerEvent) => {
      if (element.hasPointerCapture(event.pointerId)) report(event);
    };
    element.addEventListener('pointerdown', press);
    element.addEventListener('pointermove', drag);
    return () => {
      element.removeEventListener('pointerdown', press);
      element.removeEventListener('pointermove', drag);
    };
  };
