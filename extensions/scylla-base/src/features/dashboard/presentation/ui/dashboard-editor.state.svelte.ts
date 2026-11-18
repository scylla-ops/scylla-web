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
export type DragSource =
  | { from: 'grid'; id: string; size: LayoutSize }
  | { from: 'palette'; data: WidgetData; size: LayoutSize };

interface Draft {
  dashboardId: string;
  widgets: readonly LayoutWidget[];
  history: readonly (readonly LayoutWidget[])[];
}

let draft = $state.raw<Draft | null>(null);
let selected = $state<string | null>(null);
let drag = $state.raw<DragSource | null>(null);
let over = $state<number | null>(null);

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
  startDrag: (source: DragSource) => {
    drag = source;
  },
  dragOver: (index: number) => {
    over = index;
  },
  /** Moves or adds the dragged widget at the index of `over`. */
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
    if (from < 0 || from === at || from + 1 === at) return;
    change(moveWidget(draft.widgets, source.id, at > from ? at - 1 : at));
  },
  endDrag: () => {
    drag = null;
    over = null;
  },
};
