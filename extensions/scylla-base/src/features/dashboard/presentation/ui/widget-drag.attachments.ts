import { tick } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import { boxOf, dragWithPointer, pulseDrop, type Box, type Point } from '@scylla/ui/dnd';
import type { LayoutSize } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
import {
  packGrid,
  placedIndexAt,
  type Span,
} from '@base/features/dashboard/presentation/presenters/grid-pack.presenter.ts';
import {
  cellsOf,
  shownSize,
} from '@base/features/dashboard/presentation/presenters/widget-catalog.presenter.ts';
import { dashboardEditor, type DragSource } from './dashboard-editor.state.svelte.ts';

const GRID = '[data-slot="widget-grid"]';
const SLOT = '[data-slot="drop-here"]';
const HANDLE = '[data-part="widget-handle"]';
const KIND = '[data-part="widget-kind"]';
const NARROW = { columns: 2, rowHeight: 80, gap: 12 };
const WIDE = { columns: 8, rowHeight: 98, gap: 16 };
const WIDE_GRID_PX = 768;
const AREA_MARGIN_PX = 24;
// A new place waits this long under the pointer before the grid moves to it.
const DWELL_MS = 120;
// Where the pointer holds the ghost of a kind of the palette, from its top left corner.
const KIND_GRAB = { x: 32, y: 24 };

const gridOf = () => document.querySelector<HTMLElement>(GRID);
const metricsOf = (grid: HTMLElement) =>
  grid.getBoundingClientRect().width >= WIDE_GRID_PX ? WIDE : NARROW;

/** The size in px of a widget of `size` on the grid of the page: the ghost of a kind has it. */
const sizeOnGrid = (size: LayoutSize) => {
  const grid = gridOf();
  const metrics = grid ? metricsOf(grid) : WIDE;
  const width = grid?.clientWidth || 1104;
  const column = (width - metrics.gap * (metrics.columns - 1)) / metrics.columns;
  const cells = cellsOf(size, metrics.columns);
  return {
    width: cells.columns * column + (cells.columns - 1) * metrics.gap,
    height: cells.rows * metrics.rowHeight + (cells.rows - 1) * metrics.gap,
  };
};

/**
 * The index where the drag lands, from the cells of a layout without the dragged widget: the
 * widgets that move out of the way do not change it, so it does not swing. The row after the last
 * widget puts it last.
 */
const indexAt = ({ x, y }: Point): number | null => {
  const grid = gridOf();
  const drag = dashboardEditor.drag;
  if (!grid || !drag) return null;
  const box = grid.getBoundingClientRect();
  const metrics = metricsOf(grid);
  const items = dashboardEditor.widgets;
  const base = drag.from === 'grid' ? items.filter(item => item.id !== drag.id) : items;
  const spans: Span[] = [
    ...base.map(item => cellsOf(shownSize(item.data, item.size), metrics.columns)),
    { columns: metrics.columns, rows: 1 },
  ];
  return placedIndexAt(
    x,
    y,
    packGrid(spans, metrics.columns),
    { left: box.left, top: box.top, width: box.width, ...metrics },
    AREA_MARGIN_PX,
    dashboardEditor.over,
  );
};

let pending: { at: number; timer: ReturnType<typeof setTimeout> } | null = null;

const clearPending = () => {
  if (pending) clearTimeout(pending.timer);
  pending = null;
};

/**
 * A new place waits a short time under the pointer before the grid moves to it. Out of the grid,
 * on the panel for example, the drag lands nowhere at once: a widget goes back to its place.
 */
const aim = (at: number | null) => {
  if (at === null || at === dashboardEditor.over) {
    clearPending();
    if (at === null) dashboardEditor.cancel();
    return;
  }
  if (pending?.at === at) return;
  clearPending();
  if (dashboardEditor.over === null) {
    dashboardEditor.setOver(at);
    return;
  }
  pending = {
    at,
    timer: setTimeout(() => {
      pending = null;
      dashboardEditor.setOver(at);
    }, DWELL_MS),
  };
};

/** The widget that moved or came pulses once. */
const pulseWidget = async (id: string) => {
  await tick();
  pulseDrop(document.querySelector(`[data-widget="${id}"] [data-slot="widget"]`));
};

/**
 * The end of a pointer drag. A drop at a new place keeps it while the ghost flies into its slot,
 * then the widget moves (or the kind is added) and pulses. Escape, a drop out of the grid or at its
 * own place sends the ghost back: into the slot at the place of the widget, or into its kind.
 */
const finish = async (drop: boolean, home: () => Box | null) => {
  if (drop && pending) dashboardEditor.setOver(pending.at);
  clearPending();
  if (!dashboardEditor.drag) return;
  if (!drop || !dashboardEditor.moved) dashboardEditor.cancel();
  dashboardEditor.settle();
  await tick();
  const slot = document.querySelector(SLOT);
  const box = slot ? boxOf(slot.getBoundingClientRect()) : home();
  const { ghost } = dashboardEditor;
  if (box) await ghost.settle(box);
  else await ghost.back();
  const id = dashboardEditor.drop();
  ghost.end();
  if (id) await pulseWidget(id);
};

const follow = (at: Point) => {
  dashboardEditor.ghost.follow(at);
  aim(indexAt(at));
};

/**
 * The pointer drag of the widgets of the edit mode, by their handle, on the area of the grid. The
 * widget lifts and follows the pointer (`dragWithPointer`, the ghost of the editor); "Drop here"
 * shows where it lands, and the other widgets move out of the way.
 */
export const dragWidgets: Attachment<HTMLElement> = root =>
  dragWithPointer<{ source: DragSource; frame: HTMLElement }>(() => ({
    pick: target => {
      if (!dashboardEditor.active || dashboardEditor.drag) return null;
      const handle = target.closest<HTMLElement>(HANDLE);
      const frame = handle?.closest<HTMLElement>('[data-widget]');
      const item = dashboardEditor.widgets.find(widget => widget.id === frame?.dataset.widget);
      if (!handle || !frame || !item || !root.contains(frame)) return null;
      const size = shownSize(item.data, item.size);
      const label = handle.dataset.label ?? '';
      return { source: { from: 'grid', id: item.id, data: item.data, size, label }, frame };
    },
    start: ({ source, frame }, at, from) => {
      const box = boxOf(frame.getBoundingClientRect());
      dashboardEditor.pick(source);
      dashboardEditor.ghost.lift(box, { x: from.x - box.left, y: from.y - box.top }, at);
    },
    move: follow,
    end: drop => void finish(drop, () => null),
  }))(root);

/**
 * The pointer drag of the kinds of the palette onto the grid. `sourceOf` gives the widget that a
 * kind adds, or null for a kind with no data. A cancel sends the ghost back into its kind.
 */
export const dragKinds =
  (sourceOf: (kind: string) => DragSource | null): Attachment<HTMLElement> =>
  root => {
    let button: HTMLElement | null = null;
    return dragWithPointer<{ source: DragSource; button: HTMLElement }>(() => ({
      pick: target => {
        if (!dashboardEditor.active || dashboardEditor.drag) return null;
        const kind = target.closest<HTMLElement>(KIND);
        const source = kind?.dataset.kind ? sourceOf(kind.dataset.kind) : null;
        return kind && source && root.contains(kind) ? { source, button: kind } : null;
      },
      start: ({ source, button: kind }, at, from) => {
        button = kind;
        const size = sizeOnGrid(source.size);
        dashboardEditor.pick(source);
        dashboardEditor.ghost.lift(
          { left: from.x - KIND_GRAB.x, top: from.y - KIND_GRAB.y, ...size },
          KIND_GRAB,
          at,
        );
      },
      move: follow,
      end: drop =>
        void finish(drop, () =>
          button?.isConnected ? boxOf(button.getBoundingClientRect()) : null,
        ),
    }))(root);
  };
