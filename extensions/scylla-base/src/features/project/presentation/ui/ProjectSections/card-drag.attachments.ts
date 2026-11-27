import { tick } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import { motionDuration } from '@scylla/ui';
import { t } from '@scylla/ui/i18n';
import { toast } from '@scylla/ui/utils';
import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
import {
  cardTargetAt,
  PINS,
  type SectionZone,
} from '@base/features/project/presentation/presenters/project-sections.presenter.ts';
import {
  cellAfter,
  centerOf,
  draggedBox,
  edgeScroll,
  SETTLE_MS,
  type Box,
  type Point,
} from '@base/features/project/presentation/presenters/sortable.presenter.ts';
import type { ProjectReorderState } from '../project-reorder.state.svelte.ts';

const CARD = '[data-card]';
const SECTION = '[data-section]';
const HEADER = '[data-part="project-section-header"]';
const GRID = '[data-part="project-grid"]';
const SLOT = '[data-part="project-drop-slot"]';
/** A mouse moves this far before a press becomes a drag: a click stays a click. */
export const MOUSE_SLOP_PX = 4;
/** A finger holds still this long, then drags. A move before it scrolls the page. */
const TOUCH_HOLD_MS = 250;
const TOUCH_SLOP_PX = 8;

interface Press {
  pointerId: number;
  touch: boolean;
  start: Point;
  card: HTMLElement;
}

export const boxOf = ({ left, top, width, height }: DOMRect): Box => ({ left, top, width, height });

/** The box of a cell where the grid places it: a slide (a transform) does not move it. */
export const cellBox = (grid: HTMLElement, cell: HTMLElement): Box => {
  const { left, top } = grid.getBoundingClientRect();
  return {
    left: left + grid.clientLeft + cell.offsetLeft,
    top: top + grid.clientTop + cell.offsetTop,
    width: cell.offsetWidth,
    height: cell.offsetHeight,
  };
};

/** Svelte takes a cell that goes out of the flow while it fades: it is not a place anymore. */
export const inFlow = (cell: HTMLElement) => cell.style.position !== 'absolute';

const zonesOf = (root: HTMLElement, dragId: string): SectionZone[] =>
  [...root.querySelectorAll<HTMLElement>(SECTION)].map(section => {
    const key = section.dataset.section ?? '';
    const headerElement = section.querySelector<HTMLElement>(HEADER);
    const header = headerElement ? boxOf(headerElement.getBoundingClientRect()) : undefined;
    const whole = section.getBoundingClientRect();
    const grid = section.querySelector<HTMLElement>(GRID);
    // A closed section has no grid: its line of chips takes a drop as its header.
    if (!grid) {
      const height = header ? Math.max(header.height, whole.bottom - header.top) : 0;
      return { key, header: header && { ...header, height }, cells: [] };
    }
    const top = header ? header.top + header.height : whole.top;
    const body =
      whole.bottom > top
        ? { left: whole.left, top, width: whole.width, height: whole.bottom - top }
        : undefined;
    const cells = [...grid.querySelectorAll<HTMLElement>(`:scope > ${CARD}, :scope > ${SLOT}`)]
      .filter(cell => inFlow(cell) && (!cell.dataset.card || cell.dataset.card !== dragId))
      .map(cell => ({ id: cell.dataset.card, box: cellBox(grid, cell) }));
    const style = getComputedStyle(grid);
    const columns = style.gridTemplateColumns.split(' ').filter(Boolean).length;
    const gap = parseFloat(style.columnGap) || 0;
    return {
      key,
      header,
      body,
      cells,
      after: cellAfter(
        cells.map(cell => cell.box),
        columns,
        gap,
      ),
    };
  });

const nextCardOf = (card: HTMLElement): string | undefined => {
  let next = card.nextElementSibling;
  while (next && !next.matches(CARD)) next = next.nextElementSibling;
  return (next as HTMLElement | null)?.dataset.card;
};

export const scrollerOf = (node: HTMLElement): HTMLElement | null => {
  for (let parent = node.parentElement; parent; parent = parent.parentElement) {
    const { overflowY } = getComputedStyle(parent);
    if (/auto|scroll/.test(overflowY) && parent.scrollHeight > parent.clientHeight) return parent;
  }
  return document.scrollingElement as HTMLElement | null;
};

/**
 * The drag of the cards of the reorder mode, with the pointer, on the root of the sections. The
 * real card follows the pointer, and the slot goes where the center of the card is
 * (`cardTargetAt`), wherever the person took it. A drop sends the card to its slot; Escape sends
 * it back. A mouse drags after a move of a few pixels, a finger after a short hold. Near the top
 * or the bottom of the scroller, the page scrolls.
 */
export const dragCards =
  (reorder: ProjectReorderState, nameOf: (id: string) => string): Attachment<HTMLElement> =>
  root => {
    let press: Press | null = null;
    let dragging = false;
    let ending = false;
    let pointer: Point = { x: 0, y: 0 };
    // The density of the section of the card: a slot in a section of another density reshapes it.
    let source: string | undefined;
    let scroller: HTMLElement | null = null;
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    /** The card takes the shape of the slot, in a section of another density. */
    const reshape = () => {
      if (!dragging) return;
      const slot = [...root.querySelectorAll<HTMLElement>(SLOT)].find(inFlow);
      const density = slot?.closest<HTMLElement>(SECTION)?.dataset.density;
      if (!slot || !density) return;
      reorder.reshape(
        density === source ? null : { width: slot.offsetWidth, height: slot.offsetHeight },
      );
    };

    const retarget = () => {
      const drag = reorder.drag;
      if (!dragging || !drag) return;
      const center = centerOf(draggedBox(pointer, reorder.grab, reorder.box));
      const zones = zonesOf(root, drag.id);
      const target = cardTargetAt(zones, center, pointer, reorder.accepts);
      if (target) {
        reorder.refuse(null);
        reorder.hover(target.to, target.beforeId, target.header);
      } else {
        // Over the pins with a card that they have: the slot stays at the place of the card.
        const over = cardTargetAt(zones, center, pointer, key => key === PINS);
        reorder.refuse(over && !reorder.accepts(PINS) ? PINS : null);
      }
      // The slot shows in its section after the update.
      void tick().then(reshape);
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
      const card = press?.card;
      const id = card?.dataset.card;
      const from = card?.closest<HTMLElement>(SECTION)?.dataset.section;
      if (!press || !card || !id || !from) return reset();
      const box = boxOf(card.getBoundingClientRect());
      const grab = { x: press.start.x - box.left, y: press.start.y - box.top };
      source = card.closest<HTMLElement>(SECTION)?.dataset.density;
      dragging = true;
      reorder.pick({ id, name: nameOf(id), from, box, grab }, nextCardOf(card));
      scroller = scrollerOf(root);
      frame = requestAnimationFrame(scroll);
    };

    const move = (event: PointerEvent) => {
      if (event.pointerId !== press?.pointerId) return;
      pointer = { x: event.clientX, y: event.clientY };
      if (!dragging) {
        const moved = Math.hypot(pointer.x - press.start.x, pointer.y - press.start.y);
        if (press.touch) {
          if (moved > TOUCH_SLOP_PX) reset();
          return;
        }
        if (moved < MOUSE_SLOP_PX) return;
        lift();
      }
      reorder.follow(pointer);
      retarget();
    };

    /** The card goes to its slot, then the drop or the way back ends the drag. */
    const finish = async (drop: boolean) => {
      dragging = false;
      ending = true;
      const refused = drop && reorder.refused ? reorder.drag?.name : undefined;
      if (refused) toast.info(t(projectMessages.alreadyPinnedDrop(refused)));
      reset();
      if (!drop) reorder.cancel();
      await tick();
      const ms = motionDuration(SETTLE_MS);
      const slot = [...root.querySelectorAll<HTMLElement>(SLOT)].find(inFlow);
      const target = reorder.target;
      const header = target?.header
        ? root.querySelector<HTMLElement>(`${SECTION}[data-section="${target.to}"] ${HEADER}`)
        : null;
      if (ms > 0 && slot?.parentElement) {
        const box = cellBox(slot.parentElement, slot);
        reorder.settle({ x: box.left, y: box.top });
        await new Promise(resolve => (timer = setTimeout(resolve, ms)));
      } else if (ms > 0 && header) {
        // A closed section: the card goes into its header.
        const box = header.getBoundingClientRect();
        reorder.settle({ x: box.left, y: box.top + box.height / 2 - reorder.box.height / 2 }, true);
        await new Promise(resolve => (timer = setTimeout(resolve, ms)));
      }
      ending = false;
      if (drop) reorder.drop();
      else reorder.release();
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
    // A finger that drags does not scroll the page; a long press opens no menu.
    const ontouchmove = (event: TouchEvent) => {
      if (dragging) event.preventDefault();
    };
    const oncontextmenu = (event: Event) => {
      if (press) event.preventDefault();
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
      if (!reorder.active || reorder.drag || press || ending) return;
      if (event.button !== 0 || !event.isPrimary) return;
      const card = (event.target as Element | null)?.closest<HTMLElement>(CARD);
      if (!card || !root.contains(card)) return;
      const touch = event.pointerType === 'touch';
      pointer = { x: event.clientX, y: event.clientY };
      press = { pointerId: event.pointerId, touch, start: pointer, card };
      listen(true);
      if (touch) timer = setTimeout(lift, TOUCH_HOLD_MS);
      else event.preventDefault();
    };

    root.addEventListener('pointerdown', down);
    root.addEventListener('touchmove', ontouchmove, { passive: false });
    root.addEventListener('contextmenu', oncontextmenu);
    return () => {
      reset();
      root.removeEventListener('pointerdown', down);
      root.removeEventListener('touchmove', ontouchmove);
      root.removeEventListener('contextmenu', oncontextmenu);
      if (dragging || ending) reorder.release();
    };
  };
