import { createDragGhost } from '@scylla/ui/dnd';
import {
  addWidget,
  changeWidget,
  moveWidget,
  removeWidget,
  type LayoutSize,
  type LayoutWidget,
  type WidgetData,
} from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
import { anchoredIndex, packGrid } from '@base/features/dashboard/presentation/presenters/grid-pack.presenter.ts';
import { cellsOf, shownSize } from '@base/features/dashboard/presentation/presenters/widget-catalog.presenter.ts';

/** What the user drags: a widget of the grid, or a kind of the palette. */
export type DragSource = ({ from: 'grid'; id: string } | { from: 'palette' }) & {
  data: WidgetData;
  size: LayoutSize;
  label: string;
  /** The keyboard holds the widget: it moves in the grid, with no ghost. */
  keyboard?: boolean;
};

/** The end of the last drag, for the live region. `at`: the new index; null: no move. */
export interface DragEnd {
  label: string;
  at: number | null;
}

interface Draft {
  dashboardId: string;
  widgets: readonly LayoutWidget[];
  history: readonly (readonly LayoutWidget[])[];
}

let draft = $state.raw<Draft | null>(null);
let selected = $state<string | null>(null);
let drag = $state.raw<DragSource | null>(null);
let over = $state<number | null>(null);
let settling = $state(false);
let ended = $state.raw<DragEnd | null>(null);
// The index of the dragged widget before the drag; null for a kind of the palette.
let origin: number | null = null;
let live = $state.raw<{ id: string; size: LayoutSize; at: number } | null>(null);
let columns = $state(8);
const ghost = createDragGhost();

const newId = (): string => crypto.randomUUID().slice(0, 8);

const change = (next: readonly LayoutWidget[]) => {
  if (!draft) return;
  draft = { ...draft, widgets: next, history: [...draft.history, draft.widgets] };
};

const endDrag = (at: number | null) => {
  if (drag) ended = { label: drag.label, at };
  drag = null;
  over = null;
  origin = null;
  settling = false;
};

const moved = () => !!drag && over !== null && (drag.from === 'palette' || over !== origin);

/**
 * The edit mode of the dashboard: a draft of the widgets that the page and the panel share. A
 * change goes to the draft, and "Save layout" stores it. "Cancel" drops it.
 */
export const dashboardEditor = {
  get active() {
    return draft !== null;
  },
  get dashboardId() {
    return draft?.dashboardId ?? null;
  },
  get widgets(): readonly LayoutWidget[] {
    return draft?.widgets ?? [];
  },
  /** The number of changes since the start: Undo takes one back. */
  get changes() {
    return draft?.history.length ?? 0;
  },
  get selected() {
    return selected;
  },
  get drag() {
    return drag;
  },
  /** The index where a drop lands. */
  get over() {
    return over;
  },
  start: (dashboardId: string, widgets: readonly LayoutWidget[]) => {
    draft = { dashboardId, widgets, history: [] };
    selected = null;
  },
  stop: () => {
    live = null;
    draft = null;
    selected = null;
    ghost.end();
    endDrag(null);
    ended = null;
  },
  undo: () => {
    if (!draft || draft.history.length === 0) return;
    draft = {
      ...draft,
      widgets: draft.history[draft.history.length - 1],
      history: draft.history.slice(0, -1),
    };
  },
  select: (id: string | null) => {
    selected = id;
  },
  add: (data: WidgetData, size: LayoutSize, at?: number, target?: string): string => {
    const id = newId();
    change(addWidget(draft?.widgets ?? [], { id, data, size, ...(target && { target }) }, at));
    selected = id;
    return id;
  },
  remove: (id: string) => {
    change(removeWidget(draft?.widgets ?? [], id));
    if (selected === id) selected = null;
  },
  resize: (id: string, size: LayoutSize) => {
    const widget = draft?.widgets.find(item => item.id === id);
    if (widget && widget.size !== size) change(changeWidget(draft?.widgets ?? [], id, { size }));
  },
  update: (id: string, next: Partial<Omit<LayoutWidget, 'id'>>) =>
    change(changeWidget(draft?.widgets ?? [], id, next)),
  duplicate: (id: string) => {
    const widgets = draft?.widgets ?? [];
    const index = widgets.findIndex(item => item.id === id);
    if (index < 0) return;
    const copy = { ...widgets[index], id: newId() };
    change(addWidget(widgets, copy, index + 1));
    selected = copy.id;
  },
  /** The lifted widget of a pointer drag: it follows the pointer, then flies into its slot. */
  get ghost() {
    return ghost;
  },
  /** The drag goes to a new place: a drop there moves the widget, or adds the kind. */
  get moved() {
    return moved();
  },
  /** The ghost flies into its slot: the place does not change anymore. */
  get settling() {
    return settling;
  },
  get ended(): DragEnd | null {
    return ended;
  },
  /** A pointer drag takes a widget of the grid or a kind of the palette. */
  pick: (source: DragSource) => {
    if (!draft || drag) return;
    drag = source;
    origin = source.from === 'grid' ? draft.widgets.findIndex(item => item.id === source.id) : null;
    over = origin;
    settling = false;
    ended = null;
  },
  /**
   * Where the drag lands: an index in the widgets without the dragged one (a move), or in all the
   * widgets (a kind of the palette). The page shows the widgets in this order while it drags.
   */
  setOver: (at: number | null) => {
    if (drag && !drag.keyboard && !settling) over = at;
  },
  /** Escape, a lost pointer or a drop out of the grid: the slot goes back to the place of the widget. */
  cancel: () => {
    if (drag && !settling) over = origin;
  },
  /** The ghost flies into its slot: the place stays. */
  settle: () => {
    if (drag) settling = true;
  },
  /** The size of a widget while its corner is dragged: the grid shows it at once. */
  get liveResize() {
    return live;
  },
  /** The columns of the grid on the screen: a widget that grows keeps its place on it. */
  setColumns: (count: number) => {
    columns = count;
  },
  resizeLive: (id: string, size: LayoutSize) => {
    const widgets = draft?.widgets ?? [];
    const index = widgets.findIndex(item => item.id === id);
    if (index < 0) return;
    const spans = widgets.map(item => cellsOf(shownSize(item.data, item.size), columns));
    const anchor = packGrid(spans, columns)[index];
    const others = spans.filter((_, position) => position !== index);
    live = { id, size, at: anchoredIndex(others, cellsOf(size, columns), anchor, columns, index) };
  },
  /** The size at the end of the drag of the corner becomes one change. */
  commitResize: () => {
    const done = live;
    live = null;
    if (!done || !draft) return;
    const widget = draft.widgets.find(item => item.id === done.id);
    if (!widget || widget.size === done.size) return;
    change(moveWidget(changeWidget(draft.widgets, done.id, { size: done.size }), done.id, done.at));
  },
  cancelResize: () => {
    live = null;
  },
  /**
   * The drag ends: the dragged widget goes to the index of `over` (the widgets from there move
   * down), or the kind is added there. Gives the id of the widget that moved or came, else null.
   */
  drop: (): string | null => {
    const source = drag;
    const at = over;
    if (!source || at === null || !draft || !moved()) {
      endDrag(null);
      return null;
    }
    endDrag(at);
    if (source.from === 'palette') return dashboardEditor.add(source.data, source.size, at);
    change(moveWidget(draft.widgets, source.id, at));
    return source.id;
  },
  /** Space on the handle of a widget: the arrow keys then move it in the grid. */
  lift: (id: string, label: string) => {
    const index = draft?.widgets.findIndex(item => item.id === id) ?? -1;
    const widget = draft?.widgets[index];
    if (!widget || drag) return;
    drag = { from: 'grid', id, data: widget.data, size: widget.size, label, keyboard: true };
    origin = index;
    over = index;
    ended = null;
  },
  /** An arrow key: the widget goes one place back or on; the first and the last place stay. */
  step: (delta: -1 | 1) => {
    if (!drag?.keyboard || over === null || !draft) return;
    over = Math.max(0, Math.min(over + delta, draft.widgets.length - 1));
  },
  /** Escape: the widget goes back to its place, with no change. */
  restore: () => {
    if (!drag?.keyboard) return;
    endDrag(null);
  },
};
