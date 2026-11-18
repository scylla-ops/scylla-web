/** What a widget shows. Each one has its component and its sizes in the presentation. */
export type WidgetData =
  | 'summary'
  | 'last-24-hours'
  | 'right-now'
  | 'needs-you'
  | 'success-rate'
  | 'agents'
  | 'pipelines'
  | 'runs'
  | 'run-minutes'
  | 'run-duration'
  | 'activity'
  | 'quick-actions';

/** The four sizes of a widget on the grid. */
export type LayoutSize = 'xs' | 's' | 'm' | 'l';

export const WIDGET_DATA: readonly WidgetData[] = [
  'summary',
  'last-24-hours',
  'right-now',
  'needs-you',
  'success-rate',
  'agents',
  'pipelines',
  'runs',
  'run-minutes',
  'run-duration',
  'activity',
  'quick-actions',
];

export const LAYOUT_SIZES: readonly LayoutSize[] = ['xs', 's', 'm', 'l'];

/** One widget of a dashboard. `id` tells apart two widgets of the same data. */
export interface LayoutWidget {
  id: string;
  data: WidgetData;
  size: LayoutSize;
}

/** A dashboard: a name and its widgets, in the order of the grid. */
export interface DashboardLayout {
  id: string;
  name: string;
  widgets: readonly LayoutWidget[];
}

/** The dashboards of a workspace, and the one that `/dashboard` opens. */
export interface DashboardSet {
  defaultId: string;
  dashboards: readonly DashboardLayout[];
}

/** The id of the dashboard that a new workspace gets. */
export const FIRST_DASHBOARD_ID = 'default';

const widgets = (items: readonly [WidgetData, LayoutSize][]): LayoutWidget[] =>
  items.map(([data, size], index) => ({ id: `${data}-${index}`, data, size }));

/** The templates of a new dashboard, from the design. */
export const TEMPLATES = {
  /** The default layout of the design: numbers and charts. */
  bento: widgets([
    ['summary', 'l'],
    ['last-24-hours', 'm'],
    ['right-now', 'm'],
    ['needs-you', 'l'],
    ['success-rate', 's'],
    ['agents', 's'],
    ['pipelines', 'm'],
    ['runs', 'm'],
    ['run-minutes', 'xs'],
    ['run-duration', 'xs'],
    ['right-now', 'xs'],
    ['agents', 'xs'],
  ]),
  /** A sentence, the timeline and the list. */
  calm: widgets([
    ['summary', 'm'],
    ['last-24-hours', 'm'],
    ['needs-you', 'l'],
    ['activity', 'l'],
  ]),
  blank: [],
} as const satisfies Record<string, readonly LayoutWidget[]>;

export type TemplateId = keyof typeof TEMPLATES;

/** The set of a workspace that stored nothing. */
export const firstDashboardSet = (name: string): DashboardSet => ({
  defaultId: FIRST_DASHBOARD_ID,
  dashboards: [{ id: FIRST_DASHBOARD_ID, name, widgets: TEMPLATES.bento }],
});

/** The dashboard of the id, else the default one, else the first one. */
export const dashboardOf = (set: DashboardSet, id: string | null): DashboardLayout | undefined =>
  set.dashboards.find(dashboard => dashboard.id === (id ?? set.defaultId)) ??
  (id === null ? set.dashboards[0] : undefined);

export const addWidget = (
  widgets: readonly LayoutWidget[],
  widget: LayoutWidget,
  at: number = widgets.length,
): LayoutWidget[] => [...widgets.slice(0, at), widget, ...widgets.slice(at)];

export const removeWidget = (widgets: readonly LayoutWidget[], id: string): LayoutWidget[] =>
  widgets.filter(item => item.id !== id);

export const changeWidget = (
  widgets: readonly LayoutWidget[],
  id: string,
  change: Partial<Omit<LayoutWidget, 'id'>>,
): LayoutWidget[] => widgets.map(item => (item.id === id ? { ...item, ...change } : item));

/** Moves the widget to the index `to` of the list without it. */
export const moveWidget = (
  widgets: readonly LayoutWidget[],
  id: string,
  to: number,
): LayoutWidget[] => {
  const moved = widgets.find(item => item.id === id);
  if (!moved) return [...widgets];
  return addWidget(removeWidget(widgets, id), moved, Math.max(0, to));
};

/** Replaces the dashboard of the same id, or adds it at the end. */
export const upsertDashboard = (set: DashboardSet, layout: DashboardLayout): DashboardSet => ({
  ...set,
  dashboards: set.dashboards.some(dashboard => dashboard.id === layout.id)
    ? set.dashboards.map(dashboard => (dashboard.id === layout.id ? layout : dashboard))
    : [...set.dashboards, layout],
});

/** The last dashboard cannot go. The default goes to the first one that stays. */
export const deleteDashboard = (set: DashboardSet, id: string): DashboardSet => {
  const dashboards = set.dashboards.filter(dashboard => dashboard.id !== id);
  if (dashboards.length === 0) return set;
  return {
    defaultId: set.defaultId === id ? dashboards[0].id : set.defaultId,
    dashboards,
  };
};
