import { tick } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import { boxOf, dragWithPointer, layoutBox, pulseDrop, type Box, type Point } from '@scylla/ui/dnd';
import {
  groupTargetAt,
  type GroupCell,
} from '@base/features/project/presentation/presenters/project-sections.presenter.ts';
import type { GroupReorderState } from '../group-reorder.state.svelte.ts';

const GRIP = '[data-part="group-grip"]';
const CELL = '[data-group-cell]';
const HEADER = '[data-part="project-section-header"]';
// The copy of the dragged header has room around the header. It is narrow, so that the line of
// the new place shows next to it.
const COPY_MAX_PX = 400;

/** The box of the copy of a header: the header at its place in it. */
export const copyBox = (header: Box): Box => ({
  left: header.left - 8,
  top: header.top - 4,
  width: Math.min(header.width + 16, COPY_MAX_PX),
  height: header.height + 8,
});

/** The groups in the order of the page, where the column places them: a slide does not move them. */
const cellsOf = (root: HTMLElement): GroupCell[] =>
  [...root.querySelectorAll<HTMLElement>(`:scope > ${CELL}`)]
    .filter(cell => cell.style.position !== 'absolute')
    .map(cell => {
      const box = layoutBox(cell);
      return { id: cell.dataset.groupCell ?? '', top: box.top, bottom: box.top + box.height };
    });

const nextGroupOf = (cell: HTMLElement): string | undefined => {
  let next = cell.nextElementSibling;
  while (next && !next.matches(CELL)) next = next.nextElementSibling;
  return (next as HTMLElement | null)?.dataset.groupCell;
};

/**
 * The drag of a group by its handle, in the reorder mode, on the root of the sections. The
 * sections stay as they are: a copy of the header lifts and follows the pointer, and a line shows
 * the place between two groups, from the pointer (`groupTargetAt`). A drop moves the group there,
 * the groups slide to their new places, the copy flies to the header and the header pulses. Escape
 * and a drop at its own place send the copy back to the header.
 */
export const dragGroups =
  (groups: GroupReorderState, nameOf: (id: string) => string): Attachment<HTMLElement> =>
  root => {
    let pointer: Point = { x: 0, y: 0 };

    const retarget = () => {
      const drag = groups.drag;
      if (!drag || drag.keyboard || groups.settling) return;
      const target = groupTargetAt(cellsOf(root), drag.id, pointer.y, groups.target);
      if (target) groups.hover(target);
    };

    /** The header where the grid puts it: the copy flies there while the groups slide. */
    const headerBox = (id: string): Box | null => {
      const cell = root.querySelector<HTMLElement>(`${CELL}[data-group-cell="${id}"]`);
      const header = cell?.querySelector<HTMLElement>(HEADER);
      if (!cell || !header) return null;
      const { left, top } = layoutBox(cell);
      return {
        left,
        top: top + header.offsetTop,
        width: header.offsetWidth,
        height: header.offsetHeight,
      };
    };

    const finish = async (drop: boolean) => {
      const id = groups.drag?.id;
      if (!id) return;
      if (!drop) groups.cancel();
      const moved = groups.drop();
      await tick();
      const box = headerBox(id);
      if (box) await groups.ghost.settle(copyBox(box));
      groups.finish(moved);
      groups.ghost.end();
      if (moved) pulseDrop(root.querySelector(`${CELL}[data-group-cell="${id}"] ${HEADER}`));
    };

    return dragWithPointer<HTMLElement>(() => ({
      pick: target => {
        if (!groups.active || groups.drag) return null;
        const cell = target.closest(GRIP)?.closest<HTMLElement>(CELL);
        return cell && root.contains(cell) ? cell : null;
      },
      start: (cell, at, from) => {
        const header = cell.querySelector<HTMLElement>(HEADER);
        const id = cell.dataset.groupCell ?? '';
        const box = boxOf((header ?? cell).getBoundingClientRect());
        const copy = copyBox(box);
        pointer = at;
        groups.pick({ id, name: nameOf(id), box }, nextGroupOf(cell));
        groups.ghost.lift(copy, { x: from.x - copy.left, y: from.y - copy.top }, at);
      },
      move: at => {
        pointer = at;
        groups.ghost.follow(at);
        retarget();
      },
      end: drop => void finish(drop),
    }))(root);
  };
