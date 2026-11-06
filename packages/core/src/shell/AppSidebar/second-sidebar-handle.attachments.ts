import type { Attachment } from 'svelte/attachments';
import type { SecondSidebarWidth } from './second-sidebar-width.state.svelte.ts';

const KEY_STEP_PX = 16;

/** On `<html>` during a drag: the cursor stays and no text is selected, also away from the handle. */
const DRAGGING = ['select-none', 'cursor-ew-resize', '[&_*]:cursor-ew-resize!'];

const KEY_TARGETS: Record<string, (width: SecondSidebarWidth) => number> = {
  ArrowLeft: width => width.current - KEY_STEP_PX,
  ArrowRight: width => width.current + KEY_STEP_PX,
  Home: width => width.min,
  End: width => width.max,
  Enter: width => width.default,
};

/** The handle captures the pointer, so that a drag follows it over the page. */
export const resizeSecondSidebar =
  (width: SecondSidebarWidth): Attachment<HTMLElement> =>
  node => {
    const root = node.ownerDocument.documentElement;
    let origin: { pointer: number; width: number } | null = null;

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !event.isPrimary) return;
      origin = { pointer: event.clientX, width: width.current };
      node.setPointerCapture(event.pointerId);
      node.dataset.active = 'pointer';
      root.classList.add(...DRAGGING);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (origin) width.resize(origin.width + event.clientX - origin.pointer);
    };

    const onDragEnd = () => {
      if (!origin) return;
      origin = null;
      delete node.dataset.active;
      root.classList.remove(...DRAGGING);
      width.save();
    };

    const moveTo = (next: number) => {
      width.resize(next);
      width.save();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const target = KEY_TARGETS[event.key];
      if (!target) return;
      event.preventDefault();
      moveTo(target(width));
    };

    const onDoubleClick = () => {
      moveTo(width.default);
    };

    node.addEventListener('pointerdown', onPointerDown);
    node.addEventListener('pointermove', onPointerMove);
    node.addEventListener('pointerup', onDragEnd);
    node.addEventListener('pointercancel', onDragEnd);
    node.addEventListener('lostpointercapture', onDragEnd);
    node.addEventListener('keydown', onKeyDown);
    node.addEventListener('dblclick', onDoubleClick);

    return () => {
      onDragEnd();
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerup', onDragEnd);
      node.removeEventListener('pointercancel', onDragEnd);
      node.removeEventListener('lostpointercapture', onDragEnd);
      node.removeEventListener('keydown', onKeyDown);
      node.removeEventListener('dblclick', onDoubleClick);
    };
  };
