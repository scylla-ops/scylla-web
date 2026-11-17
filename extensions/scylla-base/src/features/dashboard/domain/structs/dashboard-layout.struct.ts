/** A widget that a dashboard can show. */
export type WidgetKind =
  | 'success-rate'
  | 'run-duration'
  | 'right-now'
  | 'needs-you'
  | 'pipelines'
  | 'activity'
  | 'quick-actions';

/** The four sizes of a widget on the grid. */
export type LayoutSize = 'xs' | 's' | 'm' | 'l';

export const WIDGET_KINDS: readonly WidgetKind[] = [
  'success-rate',
  'run-duration',
  'right-now',
  'needs-you',
  'pipelines',
  'activity',
  'quick-actions',
];

export const LAYOUT_SIZES: readonly LayoutSize[] = ['xs', 's', 'm', 'l'];

/** One widget of a dashboard, at one size. */
export interface LayoutWidget {
  widget: WidgetKind;
  size: LayoutSize;
}

/** A dashboard: a name and its widgets, in the order of the grid. */
export interface DashboardLayout {
  id: string;
  /** `null` for the default dashboard: the page shows its translated name. */
  name: string | null;
  widgets: readonly LayoutWidget[];
}

/** The dashboard of `/dashboard`. It always exists and has no name of its own. */
export const DEFAULT_DASHBOARD_ID = 'default';

/** The widgets of a new workspace, in the order of the design. */
export const DEFAULT_WIDGETS: readonly LayoutWidget[] = [
  { widget: 'success-rate', size: 'm' },
  { widget: 'run-duration', size: 'm' },
  { widget: 'right-now', size: 'm' },
  { widget: 'needs-you', size: 'm' },
  { widget: 'pipelines', size: 'l' },
  { widget: 'activity', size: 'm' },
  { widget: 'quick-actions', size: 'm' },
];

export const defaultDashboard = (): DashboardLayout => ({
  id: DEFAULT_DASHBOARD_ID,
  name: null,
  widgets: DEFAULT_WIDGETS,
});

/** The dashboards with the default one first, also when the list does not hold it. */
export const withDefaultDashboard = (
  dashboards: readonly DashboardLayout[],
): DashboardLayout[] => {
  const stored = dashboards.find(dashboard => dashboard.id === DEFAULT_DASHBOARD_ID);
  return [
    stored ?? defaultDashboard(),
    ...dashboards.filter(dashboard => dashboard.id !== DEFAULT_DASHBOARD_ID),
  ];
};

/** The widgets that the dashboard does not show yet, in the order of `WIDGET_KINDS`. */
export const missingWidgets = (layout: DashboardLayout): WidgetKind[] =>
  WIDGET_KINDS.filter(kind => !layout.widgets.some(item => item.widget === kind));

/** Adds the widget at the end of the grid. A widget shows once on a dashboard. */
export const addWidget = (
  layout: DashboardLayout,
  widget: WidgetKind,
  size: LayoutSize,
): DashboardLayout =>
  layout.widgets.some(item => item.widget === widget)
    ? layout
    : { ...layout, widgets: [...layout.widgets, { widget, size }] };

export const removeWidget = (layout: DashboardLayout, widget: WidgetKind): DashboardLayout => ({
  ...layout,
  widgets: layout.widgets.filter(item => item.widget !== widget),
});

export const resizeWidget = (
  layout: DashboardLayout,
  widget: WidgetKind,
  size: LayoutSize,
): DashboardLayout => ({
  ...layout,
  widgets: layout.widgets.map(item => (item.widget === widget ? { ...item, size } : item)),
});

/** Replaces the dashboard of the same id, or adds it at the end. */
export const upsertDashboard = (
  dashboards: readonly DashboardLayout[],
  layout: DashboardLayout,
): DashboardLayout[] =>
  dashboards.some(dashboard => dashboard.id === layout.id)
    ? dashboards.map(dashboard => (dashboard.id === layout.id ? layout : dashboard))
    : [...dashboards, layout];

/** The default dashboard cannot go: it is the page of `/dashboard`. */
export const deleteDashboard = (
  dashboards: readonly DashboardLayout[],
  id: string,
): DashboardLayout[] =>
  id === DEFAULT_DASHBOARD_ID ? [...dashboards] : dashboards.filter(dashboard => dashboard.id !== id);
