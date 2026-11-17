import { contextStore } from '@platform/context';
import { createMutation, createQuery } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import {
  addWidget,
  DEFAULT_DASHBOARD_ID,
  deleteDashboard,
  removeWidget,
  resizeWidget,
  upsertDashboard,
  withDefaultDashboard,
  type DashboardLayout,
  type LayoutSize,
  type WidgetKind,
} from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
import {
  dashboardLayoutMutations,
  dashboardLayoutQueries,
} from '@base/features/dashboard/presentation/dashboard-layout.queries.ts';

let editing = $state(false);

/** The name of the dashboard on the page, for the breadcrumbs. */
export const shownDashboard = $state<{ name: string | undefined }>({ name: undefined });

/** The edit mode. It stays on when the user opens a new dashboard. */
export const dashboardEditMode = {
  get on() {
    return editing;
  },
  set: (on: boolean) => {
    editing = on;
  },
};

const newId = (): string => crypto.randomUUID().slice(0, 8);

/** The dashboards of the workspace, and the one of the URL, with the changes of the edit mode. */
export const createDashboardLayout = (dashboardId: () => string) => {
  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id);
  const query = createQuery(() => dashboardLayoutQueries.list(workspaceId));
  const save = createMutation(() => dashboardLayoutMutations.save(workspaceId));

  const dashboards = $derived(query.data ?? withDefaultDashboard([]));
  const current = $derived(dashboards.find(dashboard => dashboard.id === dashboardId()));

  const change = (next: (layout: DashboardLayout) => DashboardLayout) => {
    if (current) save.mutate(upsertDashboard(dashboards, next(current)));
  };

  return {
    get dashboards() {
      return dashboards;
    },
    /** `undefined` when no dashboard has the id of the URL. */
    get current() {
      return current;
    },
    get loaded() {
      return query.isSuccess;
    },
    get isDefault() {
      return dashboardId() === DEFAULT_DASHBOARD_ID;
    },
    resize: (widget: WidgetKind, size: LayoutSize) =>
      change(layout => resizeWidget(layout, widget, size)),
    add: (widget: WidgetKind, size: LayoutSize) => change(layout => addWidget(layout, widget, size)),
    remove: (widget: WidgetKind) => change(layout => removeWidget(layout, widget)),
    rename: (name: string) => change(layout => ({ ...layout, name })),
    /** Returns the id of the new dashboard. It has no widget. */
    create: (name: string): string => {
      const id = newId();
      save.mutate([...dashboards, { id, name, widgets: [] }]);
      return id;
    },
    deleteCurrent: () => save.mutate(deleteDashboard(dashboards, dashboardId())),
  };
};

export type DashboardLayoutState = ReturnType<typeof createDashboardLayout>;
