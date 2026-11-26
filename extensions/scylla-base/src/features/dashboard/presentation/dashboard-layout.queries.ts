import { getModuleDomain, getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import { t } from '@scylla/ui/i18n';
import { toast } from '@scylla/ui/utils';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import {
  firstDashboardSet,
  TEMPLATES,
  type DashboardLayout,
  type DashboardSet,
  type DashboardVisibility,
} from '../domain/structs/dashboard-layout.struct.ts';
import type {
  DashboardChange,
  DashboardDraft,
  DashboardLayoutRepository,
  DashboardPreferences,
  StoredDashboard,
} from '../domain/repository/dashboard-layout.repository.ts';
import { editorMessages } from './messages/editor.messages.ts';
import { dashboardPath } from './presenters/dashboard-paths.presenter.ts';

const domain = () =>
  getModuleDomain<{
    dashboardLayoutRepository: DashboardLayoutRepository;
    dashboardPreferences: DashboardPreferences;
  }>('dashboard');

export const DASHBOARDS_QUERY_KEY = (workspaceId: string | null) =>
  ['dashboard', 'layouts', workspaceId] as const;

/** Under the key of the set: an invalidation of the set also reaches it. */
const DASHBOARD_LIST_QUERY_KEY = (workspaceId: string | null) =>
  [...DASHBOARDS_QUERY_KEY(workspaceId), 'list'] as const;

/** The list of the search bar reads the server again at its next use. */
const forgetList = (workspaceId: string | null) =>
  void getQueryClient().invalidateQueries({ queryKey: DASHBOARD_LIST_QUERY_KEY(workspaceId), exact: true });

/** The default of the person, else the team default, else the first dashboard. */
const defaultOf = (dashboards: readonly StoredDashboard[], mine: string | null): string =>
  (dashboards.find(dashboard => dashboard.id === mine) ??
    dashboards.find(dashboard => dashboard.teamDefault) ??
    dashboards[0])?.id ?? '';

/**
 * The dashboards of the workspace. With none on the server, the layouts of an older build go to
 * the server once; with no such layouts, the first dashboard does. A caller that cannot create a
 * dashboard sees the first layout, not saved.
 */
const loadSet = async (workspaceId: string, firstName: string): Promise<DashboardSet> => {
  const { dashboardLayoutRepository: repository, dashboardPreferences: preferences } = domain();
  let dashboards = await repository.list(workspaceId);
  if (dashboards.length === 0) {
    const legacy = preferences.legacy(workspaceId);
    try {
      if (legacy) {
        for (const dashboard of legacy.dashboards) {
          const created = await repository.create(workspaceId, {
            name: dashboard.name,
            widgets: dashboard.widgets,
            visibility: 'private',
          });
          if (dashboard.id === legacy.defaultId) preferences.setDefaultId(workspaceId, created.id);
          dashboards.push(created);
        }
        preferences.forgetLegacy(workspaceId);
      } else {
        dashboards = [
          await repository.create(workspaceId, { name: firstName, widgets: TEMPLATES.bento, visibility: 'private' }),
        ];
      }
      forgetList(workspaceId);
    } catch (error) {
      if (dashboards.length === 0) return legacy ?? firstDashboardSet(firstName);
      throw error;
    }
  }
  return { defaultId: defaultOf(dashboards, preferences.defaultId(workspaceId)), dashboards };
};

export const dashboardLayoutQueries = {
  set: (workspaceId: string | null, firstName: string) =>
    queryOptions<DashboardSet>({
      queryKey: DASHBOARDS_QUERY_KEY(workspaceId),
      queryFn: () => loadSet(workspaceId ?? '', firstName),
      enabled: !!workspaceId,
      staleTime: 30_000,
    }),
};

/** A dashboard in the search bar: what its row shows, and its path in the workspace. */
export interface DashboardEntry {
  id: string;
  name: string;
  visibility: DashboardVisibility;
  teamDefault: boolean;
  /** The id of the actor that created it. */
  createdBy?: string;
  /** `dashboard` for the default one, else `dashboards/<id>`. */
  path: string;
}

const entriesOf = (dashboards: readonly DashboardLayout[], defaultId: string): DashboardEntry[] =>
  dashboards.map(dashboard => ({
    id: dashboard.id,
    name: dashboard.name,
    visibility: dashboard.visibility ?? 'private',
    teamDefault: !!dashboard.teamDefault,
    ...(dashboard.createdBy && { createdBy: dashboard.createdBy }),
    path: dashboardPath(dashboard.id, dashboard.id === defaultId),
  }));

const listEntries = async (workspaceId: string): Promise<DashboardEntry[]> => {
  const { dashboardLayoutRepository: repository, dashboardPreferences: preferences } = domain();
  const dashboards = await repository.list(workspaceId);
  return entriesOf(dashboards, defaultOf(dashboards, preferences.defaultId(workspaceId)));
};

/** The dashboards of the set of the page that the server has, while the set is in the cache. */
const cachedEntries = (workspaceId: string | null): DashboardEntry[] | undefined => {
  const set = getQueryClient().getQueryData<DashboardSet>(DASHBOARDS_QUERY_KEY(workspaceId));
  return set && entriesOf(set.dashboards.filter(dashboard => dashboard.version !== undefined), set.defaultId);
};

/**
 * The dashboards that the person can open, for the search bar. It only reads: a search never
 * creates the first dashboard, the page does. It starts from the set of the page when the cache
 * has it, so the bar sends no request after a visit of the page.
 */
export const dashboardQueries = {
  list: (workspaceId: string | null) =>
    queryOptions({
      queryKey: DASHBOARD_LIST_QUERY_KEY(workspaceId),
      queryFn: () => listEntries(workspaceId ?? ''),
      initialData: () => cachedEntries(workspaceId),
      initialDataUpdatedAt: () =>
        getQueryClient().getQueryState(DASHBOARDS_QUERY_KEY(workspaceId))?.dataUpdatedAt,
      enabled: !!workspaceId,
      staleTime: 30_000,
    }),
};

/** A conflict says so and reads the dashboards again: a change never writes over a newer one. */
const reportError = (workspaceId: string | null) => (error: unknown) => {
  const refusal = ScyllaError.from(error);
  if (refusal.isConflict() || refusal.isNotFound()) {
    toast.warning(t(editorMessages.changedElsewhere));
  } else {
    toast.error(refusal.userMessage());
  }
  void getQueryClient().invalidateQueries({ queryKey: DASHBOARDS_QUERY_KEY(workspaceId) });
};

/** Puts a dashboard that the server gave back in the cache, in place of the one of the same id. */
const keep = (workspaceId: string | null, stored: StoredDashboard) => {
  getQueryClient().setQueryData<DashboardSet>(DASHBOARDS_QUERY_KEY(workspaceId), set =>
    set && {
      ...set,
      dashboards: set.dashboards.some(dashboard => dashboard.id === stored.id)
        ? set.dashboards.map(dashboard =>
            dashboard.id === stored.id
              ? { ...stored, widgets: stored.widgets.length || !('widgets' in dashboard) ? stored.widgets : dashboard.widgets }
              : stored.teamDefault
                ? { ...dashboard, teamDefault: false }
                : dashboard,
          )
        : [...set.dashboards, stored],
    },
  );
  forgetList(workspaceId);
};

const meta = { showsOwnError: true } as const;

export const dashboardLayoutMutations = {
  create: (workspaceId: string | null) =>
    mutationOptions({
      meta,
      mutationFn: (draft: DashboardDraft) => domain().dashboardLayoutRepository.create(workspaceId ?? '', draft),
      onSuccess: (stored: StoredDashboard) => keep(workspaceId, stored),
      onError: reportError(workspaceId),
    }),
  update: (workspaceId: string | null) =>
    mutationOptions({
      meta,
      mutationFn: (change: DashboardChange) => domain().dashboardLayoutRepository.update(change),
      onSuccess: (stored: StoredDashboard) => keep(workspaceId, stored),
      onError: reportError(workspaceId),
    }),
  remove: (workspaceId: string | null) =>
    mutationOptions({
      meta,
      mutationFn: (id: string) => domain().dashboardLayoutRepository.remove(id),
      onSuccess: () => getQueryClient().invalidateQueries({ queryKey: DASHBOARDS_QUERY_KEY(workspaceId) }),
      onError: reportError(workspaceId),
    }),
  teamDefault: (workspaceId: string | null) =>
    mutationOptions({
      meta,
      mutationFn: (id: string) => domain().dashboardLayoutRepository.setTeamDefault(workspaceId ?? '', id),
      onSuccess: (stored: StoredDashboard) => keep(workspaceId, stored),
      onError: reportError(workspaceId),
    }),
};

/** The default dashboard of the person: it stays in this browser. */
export const setMyDefault = (workspaceId: string | null, id: string) => {
  if (!workspaceId) return;
  domain().dashboardPreferences.setDefaultId(workspaceId, id);
  getQueryClient().setQueryData<DashboardSet>(DASHBOARDS_QUERY_KEY(workspaceId), set => set && { ...set, defaultId: id });
  forgetList(workspaceId);
};
