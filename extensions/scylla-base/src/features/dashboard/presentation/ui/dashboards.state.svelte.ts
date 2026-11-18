import { contextStore } from '@platform/context';
import { createMutation, createQuery } from '@scylla/core-sdk';
import { t } from '@scylla/ui/i18n';
import { toRune } from '@scylla/ui/stores';
import {
  dashboardOf,
  firstDashboardSet,
  TEMPLATES,
  type DashboardLayout,
  type DashboardSet,
  type DashboardVisibility,
  type LayoutWidget,
  type TemplateId,
} from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
import { dashboardMessages } from '@base/features/dashboard/presentation/messages/dashboard.messages.ts';
import { editorMessages } from '@base/features/dashboard/presentation/messages/editor.messages.ts';
import {
  dashboardLayoutMutations,
  dashboardLayoutQueries,
  setMyDefault,
} from '@base/features/dashboard/presentation/dashboard-layout.queries.ts';

const newId = (): string => crypto.randomUUID().slice(0, 8);

/** The widgets of a template or of a dashboard, with new ids. */
const copied = (widgets: readonly LayoutWidget[]): LayoutWidget[] =>
  widgets.map(widget => ({ ...widget, id: newId() }));

/** How a new dashboard starts: a template, or a copy of a dashboard. */
export type DashboardStart = { template: TemplateId } | { copyOf: string };

/**
 * The dashboards of the workspace and their changes, on the server. Each change sends the version
 * that the page read: a conflict reads the dashboards again. The page and the panel each create
 * one: the query cache holds one set.
 */
export const createDashboards = () => {
  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id);
  const query = createQuery(() => dashboardLayoutQueries.set(workspaceId, t(dashboardMessages.opsOverview)));
  const createOne = createMutation(() => dashboardLayoutMutations.create(workspaceId));
  const updateOne = createMutation(() => dashboardLayoutMutations.update(workspaceId));
  const removeOne = createMutation(() => dashboardLayoutMutations.remove(workspaceId));
  const teamDefault = createMutation(() => dashboardLayoutMutations.teamDefault(workspaceId));

  const set = $derived<DashboardSet>(query.data ?? firstDashboardSet(t(dashboardMessages.opsOverview)));

  /** A layout that the server does not have yet is created; else it changes at its version. */
  const change = (id: string, next: { name?: string; widgets?: readonly LayoutWidget[]; visibility?: DashboardVisibility }) => {
    const dashboard = dashboardOf(set, id);
    if (!dashboard) return;
    if (dashboard.version === undefined) {
      createOne.mutate({
        name: next.name ?? dashboard.name,
        widgets: next.widgets ?? dashboard.widgets,
        visibility: next.visibility ?? 'private',
      });
      return;
    }
    updateOne.mutate({ id, version: dashboard.version, ...next });
  };

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
    saveWidgets: (id: string, widgets: readonly LayoutWidget[]) => change(id, { widgets }),
    rename: (id: string, name: string) => {
      if (name.trim()) change(id, { name: name.trim() });
    },
    share: (id: string, visibility: DashboardVisibility) => change(id, { visibility }),
    setDefault: (id: string) => setMyDefault(workspaceId, id),
    setTeamDefault: (id: string) => teamDefault.mutate(id),
    remove: (id: string) => {
      if (dashboardOf(set, id)?.version !== undefined) removeOne.mutate(id);
    },
    /** Resolves with the new dashboard, once the server has it. */
    create: async (name: string, start: DashboardStart, makeDefault: boolean): Promise<DashboardLayout> => {
      const source =
        'template' in start ? TEMPLATES[start.template] : (dashboardOf(set, start.copyOf)?.widgets ?? []);
      const created = await createOne.mutateAsync({ name: name.trim(), widgets: copied(source), visibility: 'private' });
      if (makeDefault) setMyDefault(workspaceId, created.id);
      return created;
    },
    duplicate: async (id: string): Promise<string | null> => {
      const dashboard = dashboardOf(set, id);
      if (!dashboard) return null;
      const created = await createOne.mutateAsync({
        name: t(editorMessages.copyName(dashboard.name)),
        widgets: copied(dashboard.widgets),
        visibility: 'private',
      });
      return created.id;
    },
  };
};

export type DashboardsState = ReturnType<typeof createDashboards>;
