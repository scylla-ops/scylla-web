import {
  addWidget,
  changeWidget,
  moveWidget,
  removeWidget,
  type LayoutSize,
  type LayoutWidget,
  type WidgetData,
} from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';

/** What the user drags: a widget of the grid, or a kind of the palette. */
export type DragSource = (
  | { from: 'grid'; id: string; size: LayoutSize }
  | { from: 'palette'; data: WidgetData; size: LayoutSize }
) & { label: string };

/** A drag starts once the pointer moved this far with the button down: less is a click. */
const DRAG_THRESHOLD_PX = 4;

interface Draft {
  dashboardId: string;
  widgets: readonly LayoutWidget[];
  history: readonly (readonly LayoutWidget[])[];
}

let draft = $state.raw<Draft | null>(null);
let selected = $state<string | null>(null);
let drag = $state.raw<DragSource | null>(null);
let pressed = $state.raw<{ source: DragSource; x: number; y: number } | null>(null);
let pointer = $state.raw<{ x: number; y: number } | null>(null);
let over = $state<number | null>(null);
let dropped = false;

const newId = (): string => crypto.randomUUID().slice(0, 8);

const change = (next: readonly LayoutWidget[]) => {
  if (!draft) return;
  draft = { ...draft, widgets: next, history: [...draft.history, draft.widgets] };
};

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
    draft = null;
    selected = null;
    drag = null;
    pressed = null;
    pointer = null;
    over = null;
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
  add: (data: WidgetData, size: LayoutSize, at?: number): string => {
    const id = newId();
    change(addWidget(draft?.widgets ?? [], { id, data, size }, at));
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
  /** The pointer of an active drag, for the label that follows it. */
  get pointer() {
    return pointer;
  },
  /** The button went down on a handle or a kind: a move past the threshold starts the drag. */
  press: (source: DragSource, x: number, y: number) => {
    pressed = { source, x, y };
  },
  /** `at` is the index under the pointer, `null` out of the grid. */
  move: (x: number, y: number, at: number | null) => {
    if (!drag && pressed) {
      if (Math.hypot(x - pressed.x, y - pressed.y) < DRAG_THRESHOLD_PX) return;
      drag = pressed.source;
    }
    if (!drag) return;
    pointer = { x, y };
    over = at;
  },
  /** Ends a press. Returns `true` when it was a drag: the click that follows does nothing. */
  release: (): boolean => {
    const dragged = drag !== null;
    pressed = null;
    pointer = null;
    if (dragged) dashboardEditor.drop();
    dropped = dragged;
    return dragged;
  },
  /** The dragged widget takes the place of the index of `over`: the widgets from there move down. */
  drop: () => {
    const source = drag;
    const at = over;
    drag = null;
    over = null;
    if (!source || at === null || !draft) return;
    if (source.from === 'palette') {
      dashboardEditor.add(source.data, source.size, at);
      return;
    }
    const from = draft.widgets.findIndex(item => item.id === source.id);
    if (from < 0 || from === at) return;
    change(moveWidget(draft.widgets, source.id, Math.min(at, draft.widgets.length - 1)));
  },
  /** `true` once after a drag: the click that ends it does nothing. */
  takeDropClick: (): boolean => {
    const was = dropped;
    dropped = false;
    return was;
  },
  /** Escape, or the pointer went away: nothing moves. */
  cancelDrag: () => {
    drag = null;
    pressed = null;
    pointer = null;
    over = null;
  },
};
