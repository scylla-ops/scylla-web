import { tick } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import { motionDuration } from '@scylla/ui';
import { groupTargetAt } from '@base/features/project/presentation/presenters/project-sections.presenter.ts';
import {
  centerOf,
  draggedBox,
  edgeScroll,
  SETTLE_MS,
  type Point,
} from '@base/features/project/presentation/presenters/sortable.presenter.ts';
import type { GroupReorderState } from '../group-reorder.state.svelte.ts';
import { boxOf, cellBox, inFlow, MOUSE_SLOP_PX, scrollerOf } from './card-drag.attachments.ts';

const GRIP = '[data-part="group-grip"]';
const CELL = '[data-group-cell]';
const SLOT = '[data-part="group-drop-slot"]';
const HEADER = '[data-part="project-section-header"]';

interface Press {
  pointerId: number;
  start: Point;
  cell: HTMLElement;
}

/** The groups and the slot in the order of the page, without the dragged group. */
const cellsOf = (root: HTMLElement, dragId: string) =>
  [...root.querySelectorAll<HTMLElement>(`:scope > ${CELL}, :scope > ${SLOT}`)]
    .filter(cell => inFlow(cell) && cell.dataset.groupCell !== dragId)
    .map(cell => ({ id: cell.dataset.groupCell, box: cellBox(root, cell) }));

const nextGroupOf = (cell: HTMLElement): string | undefined => {
  let next = cell.nextElementSibling;
  while (next && !next.matches(CELL)) next = next.nextElementSibling;
  return (next as HTMLElement | null)?.dataset.groupCell;
};

/**
 * The drag of a group by its handle, in the reorder mode, on the root of the sections. Each
 * section folds; the header of the group follows the pointer, and the slot goes to the group
 * nearest to the center of the header (`groupTargetAt`). A drop sends the header to the slot;
 * Escape sends it back. Near the top or the bottom of the scroller, the page scrolls.
 */
export const dragGroups =
  (groups: GroupReorderState, nameOf: (id: string) => string): Attachment<HTMLElement> =>
  root => {
    let press: Press | null = null;
    let dragging = false;
    let ending = false;
    let pointer: Point = { x: 0, y: 0 };
    let scroller: HTMLElement | null = null;
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const retarget = () => {
      const drag = groups.drag;
      if (!dragging || !drag) return;
      const cells = cellsOf(root, drag.id);
      const last = cells.at(-1)?.box;
      const after = last ? { ...last, top: last.top + last.height } : null;
      const target = groupTargetAt(cells, after, centerOf(draggedBox(pointer, drag.grab, drag.box)));
      if (target) groups.hover(target);
    };

    const scroll = () => {
      if (!dragging || !scroller) return;
      const page = scroller === document.scrollingElement;
      const { top, bottom } = page
        ? { top: 0, bottom: innerHeight }
        : scroller.getBoundingClientRect();
      const step = edgeScroll(pointer.y, Math.max(top, 0), Math.min(bottom, innerHeight));
      if (step !== 0) scroller.scrollTop += step;
      frame = requestAnimationFrame(scroll);
    };

    const lift = () => {
      const cell = press?.cell;
      const id = cell?.dataset.groupCell;
      const header = cell?.querySelector<HTMLElement>(HEADER);
      if (!press || !cell || !id || !header) return reset();
      const box = boxOf(header.getBoundingClientRect());
      const grab = { x: press.start.x - box.left, y: press.start.y - box.top };
      dragging = true;
      groups.pick({ id, name: nameOf(id), box, grab }, nextGroupOf(cell));
      scroller = scrollerOf(root);
      frame = requestAnimationFrame(scroll);
    };

    const move = (event: PointerEvent) => {
      if (event.pointerId !== press?.pointerId) return;
      pointer = { x: event.clientX, y: event.clientY };
      if (!dragging) {
        if (Math.hypot(pointer.x - press.start.x, pointer.y - press.start.y) < MOUSE_SLOP_PX) return;
        lift();
      }
      groups.follow(pointer);
      retarget();
    };

    /** The header goes to the slot, then the drop or the way back ends the drag. */
    const finish = async (drop: boolean) => {
      dragging = false;
      ending = true;
      reset();
      if (!drop) groups.cancel();
      await tick();
      const ms = motionDuration(SETTLE_MS);
      const slot = [...root.querySelectorAll<HTMLElement>(`:scope > ${SLOT}`)].find(inFlow);
      if (ms > 0 && slot) {
        const box = cellBox(root, slot);
        groups.settle({ x: box.left, y: box.top });
        await new Promise(resolve => (timer = setTimeout(resolve, ms)));
      }
      ending = false;
      if (drop) groups.drop();
      else groups.release();
    };

    const up = (event: PointerEvent) => {
      if (event.pointerId !== press?.pointerId) return;
      if (dragging) void finish(true);
      else reset();
    };
    const lost = (event: PointerEvent) => {
      if (event.pointerId !== press?.pointerId) return;
      if (dragging) void finish(false);
      else reset();
    };
    const blur = () => (dragging ? void finish(false) : reset());
    const onkeydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !dragging) return;
      event.preventDefault();
      void finish(false);
    };

    const listen = (on: boolean) => {
      if (on) {
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', lost);
        window.addEventListener('keydown', onkeydown);
        window.addEventListener('blur', blur);
        window.addEventListener('scroll', retarget, true);
        return;
      }
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', lost);
      window.removeEventListener('keydown', onkeydown);
      window.removeEventListener('blur', blur);
      window.removeEventListener('scroll', retarget, true);
    };

    function reset() {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      if (press) listen(false);
      press = null;
    }

    const down = (event: PointerEvent) => {
      if (!groups.active || groups.drag || press || ending) return;
      if (event.button !== 0 || !event.isPrimary) return;
      const grip = (event.target as Element | null)?.closest<HTMLElement>(GRIP);
      const cell = grip?.closest<HTMLElement>(CELL);
      if (!grip || !cell || !root.contains(cell)) return;
      event.preventDefault();
      pointer = { x: event.clientX, y: event.clientY };
      press = { pointerId: event.pointerId, start: pointer, cell };
      listen(true);
    };

    root.addEventListener('pointerdown', down);
    return () => {
      reset();
      root.removeEventListener('pointerdown', down);
      if (dragging || ending) groups.release();
    };
  };
