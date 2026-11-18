import { contextStore } from '@platform/context';
import { createMutation, createQuery } from '@scylla/core-sdk';
import { t } from '@scylla/ui/i18n';
import { toRune } from '@scylla/ui/stores';
import {
  dashboardOf,
  deleteDashboard,
  firstDashboardSet,
  TEMPLATES,
  upsertDashboard,
  type DashboardLayout,
  type DashboardSet,
  type LayoutWidget,
  type TemplateId,
} from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
import { dashboardMessages } from '@base/features/dashboard/presentation/messages/dashboard.messages.ts';
import { editorMessages } from '@base/features/dashboard/presentation/messages/editor.messages.ts';
import {
  dashboardLayoutMutations,
  dashboardLayoutQueries,
} from '@base/features/dashboard/presentation/dashboard-layout.queries.ts';

const newId = (): string => crypto.randomUUID().slice(0, 8);

/** The widgets of a template or of a dashboard, with new ids. */
const copied = (widgets: readonly LayoutWidget[]): LayoutWidget[] =>
  widgets.map(widget => ({ ...widget, id: newId() }));

/** How a new dashboard starts: a template, or a copy of a dashboard. */
export type DashboardStart = { template: TemplateId } | { copyOf: string };

/**
 * The dashboards of the workspace and their changes. Each change saves the whole set. The page
 * and the panel each create one: the query cache holds one set.
 */
export const createDashboards = () => {
  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id);
  const query = createQuery(() => dashboardLayoutQueries.set(workspaceId));
  const saveSet = createMutation(() => dashboardLayoutMutations.save(workspaceId));

  const set = $derived<DashboardSet>(query.data ?? firstDashboardSet(t(dashboardMessages.opsOverview)));
  const save = (next: DashboardSet) => saveSet.mutate(next);

  return {
    get set() {
      return set;
    },
    get loaded() {
      return query.isSuccess;
    },
    /** `null`: the default dashboard. `undefined` when no dashboard has the id. */
    dashboardOf: (id: string | null): DashboardLayout | undefined => dashboardOf(set, id),
    isDefault: (id: string) => set.defaultId === id,
    saveWidgets: (id: string, widgets: readonly LayoutWidget[]) => {
      const dashboard = dashboardOf(set, id);
      if (dashboard) save(upsertDashboard(set, { ...dashboard, widgets }));
    },
    rename: (id: string, name: string) => {
      const dashboard = dashboardOf(set, id);
      if (dashboard && name.trim()) save(upsertDashboard(set, { ...dashboard, name: name.trim() }));
    },
    setDefault: (id: string) => save({ ...set, defaultId: id }),
    remove: (id: string) => save(deleteDashboard(set, id)),
    /** Returns the new dashboard. */
    create: (name: string, start: DashboardStart, makeDefault: boolean): DashboardLayout => {
      const id = newId();
      const source =
        'template' in start ? TEMPLATES[start.template] : (dashboardOf(set, start.copyOf)?.widgets ?? []);
      const created = { id, name: name.trim(), widgets: copied(source) };
      const next = upsertDashboard(set, created);
      save(makeDefault ? { ...next, defaultId: id } : next);
      return created;
    },
    duplicate: (id: string): string | null => {
      const dashboard = dashboardOf(set, id);
      if (!dashboard) return null;
      const copy = newId();
      save(
        upsertDashboard(set, {
          id: copy,
          name: t(editorMessages.copyName(dashboard.name)),
          widgets: copied(dashboard.widgets),
        }),
      );
      return copy;
    },
  };
};

export type DashboardsState = ReturnType<typeof createDashboards>;
