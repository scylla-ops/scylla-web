import { getModuleDomain, getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import { i18n } from '@lingui/core';
import { Permission, authorizationReady, can } from '@platform/authz';
import { toast } from '@scylla/ui/utils';
import type { AppsModule } from '../apps.module.ts';
import type { AppDetails } from '../domain/entities/app.entity.ts';
import { appsMessages } from './messages/apps.messages.ts';
import { appRolesOf } from '@base/features/apps/domain/structs/app-list.struct.ts';
import { agentAccessOf, type RunnerChange } from '../domain/structs/agent-access.struct.ts';
import type { AgentStats } from '../domain/structs/agent-stats.struct.ts';
import type { StatsPeriod } from '../domain/structs/stats-period.struct.ts';
import { accessQueries, projectRef, workspaceRef, type ObjectRef } from '@base/features/access';
import { projectQueries } from '@base/features/project';

const repository = () => getModuleDomain<typeof AppsModule.domain>('apps').appsRepository;

/** A new app. An agent of some projects gets `runner` on each of them only. */
export interface NewApp {
  name: string;
  runner: boolean;
  projectIds?: readonly string[];
}

/** Which apps a list shows. */
export type AppFilter = 'all' | 'agents' | 'others';

const runnerOf = (filter: AppFilter): boolean | undefined =>
  filter === 'all' ? undefined : filter === 'agents';

/** A machine joined with a new key, and, for an agent, it is connected. */
export const hasJoined = (details: AppDetails | undefined, keysBefore: number): boolean =>
  !!details && details.keys.length > keysBefore && (!details.app.runner || details.app.connected);

/** A machine joined with a new key, and its agent did not connect yet. */
export const isJoining = (details: AppDetails | undefined, keysBefore: number): boolean =>
  !!details && details.keys.length > keysBefore && !details.app.connected;

export const APPS_QUERY_ROOT = ['apps'] as const;
/** The onboarding tour follows the creation of the first agent. */
export const CREATE_APP_MUTATION_KEY = ['apps', 'create'] as const;
export const APPS_QUERY_KEY = (workspaceId: string, filter: AppFilter) =>
  [...APPS_QUERY_ROOT, workspaceId, filter] as const;
export const APP_QUERY_KEY = (appId: string) => [...APPS_QUERY_ROOT, 'one', appId] as const;
export const APP_JOBS_QUERY_KEY = (appId: string) => [...APPS_QUERY_ROOT, 'jobs', appId] as const;

/** The recent jobs of an agent: enough for its stats and its list. */
const RECENT_JOBS = 100;

/**
 * Each read checks `list_apps` or `get_app` itself: other features run them. The agents and the
 * other apps need the same right on the server; the UI names it twice.
 */
const canList = (workspaceId: string) =>
  authorizationReady() &&
  (can(Permission.LIST_AGENTS, { workspaceId: workspaceId }) ||
    can(Permission.LIST_APPS_BY_WORKSPACE, { workspaceId: workspaceId }));

/** The stats of the agents need their own right: a reader of the apps can miss it. */
const canReadStats = (workspaceId: string) =>
  authorizationReady() && can(Permission.READ_APP_STATS, { workspaceId: workspaceId });

/** The roles on the workspace, and on each of its projects. */
const rolesInWorkspace = async (workspaceId: string) => {
  const client = getQueryClient();
  const roles = (object: ObjectRef) =>
    client.fetchQuery({ ...accessQueries.list(object), staleTime: 0 });
  const [workspace, projects] = await Promise.all([
    roles(workspaceRef(workspaceId)),
    client.fetchQuery(projectQueries.lookup(workspaceId)),
  ]);
  const byProject = await Promise.all(
    projects.items.map(async project => ({
      id: project.id,
      name: project.name,
      entries: await roles(projectRef(project.id)),
    })),
  );
  return { workspace, byProject };
};

export const appQueries = {
  /** Anyone can read it, and only a new server changes it. */
  server: () =>
    queryOptions({
      queryKey: [...APPS_QUERY_ROOT, 'server'] as const,
      queryFn: () => repository().getServerInfo(),
      staleTime: 60 * 60 * 1000,
    }),

  list: (workspaceId: string, filter: AppFilter = 'all') =>
    queryOptions({
      queryKey: APPS_QUERY_KEY(workspaceId, filter),
      queryFn: () => repository().listApps(workspaceId, runnerOf(filter)),
      enabled: !!workspaceId && canList(workspaceId),
      // The connection of an agent changes on its own.
      refetchInterval: 15_000,
    }),

  /** The agents of a workspace: the pipelines warn when none is connected. */
  runners: (workspaceId: string) => appQueries.list(workspaceId, 'agents'),

  byId: (appId: string, workspaceId: string) =>
    queryOptions({
      queryKey: APP_QUERY_KEY(appId),
      queryFn: () => repository().getApp(appId),
      enabled:
        !!appId && authorizationReady() && can(Permission.READ_APP, { workspaceId: workspaceId }),
      refetchInterval: 15_000,
    }),

  /**
   * An app that a join waits for: it reads it every 2 s until a machine joined with a new key
   * (more than `keysBefore`) and the agent connected.
   */
  waiting: (appId: string, workspaceId: string, keysBefore: number) =>
    queryOptions({
      ...appQueries.byId(appId, workspaceId),
      refetchInterval: query => (hasJoined(query.state.data, keysBefore) ? false : 2_000),
    }),

  jobs: (workspaceId: string, appId: string, enabled = true) =>
    queryOptions({
      queryKey: APP_JOBS_QUERY_KEY(appId),
      queryFn: () => repository().listJobs(workspaceId, appId, RECENT_JOBS),
      enabled: enabled && !!workspaceId && !!appId,
    }),

  /** The 30 days of each agent with a job in them, by agent. */
  agentStats: (workspaceId: string) =>
    queryOptions({
      queryKey: [...APPS_QUERY_ROOT, 'stats', workspaceId] as const,
      queryFn: async () =>
        new Map(
          (await repository().listAgentStats(workspaceId)).map(stats => [stats.agentId, stats]),
        ),
      enabled: !!workspaceId && canReadStats(workspaceId),
      refetchInterval: 60_000,
    }),

  /** The projects of each agent, from the `runner` roles on the workspace and on each project. */
  agentAccess: (workspaceId: string, agentIds: readonly string[], enabled: boolean) =>
    queryOptions({
      queryKey: [...APPS_QUERY_ROOT, 'access', workspaceId, [...agentIds].sort()] as const,
      queryFn: async () => {
        const { workspace, byProject } = await rolesInWorkspace(workspaceId);
        return new Map(agentIds.map(id => [id, agentAccessOf(id, workspace, byProject)]));
      },
      enabled: enabled && !!workspaceId && agentIds.length > 0,
    }),

  /** The roles of each app, on the workspace and on each project. */
  appRoles: (
    workspaceId: string,
    workspaceName: string,
    appIds: readonly string[],
    enabled: boolean,
  ) =>
    queryOptions({
      queryKey: [...APPS_QUERY_ROOT, 'roles', workspaceId, [...appIds].sort()] as const,
      queryFn: async () => {
        const { workspace, byProject } = await rolesInWorkspace(workspaceId);
        const named = { name: workspaceName, entries: workspace };
        return new Map(appIds.map(id => [id, appRolesOf(id, named, byProject)]));
      },
      enabled: enabled && !!workspaceId && appIds.length > 0,
    }),

  /**
   * The days of a period of one agent. A new period keeps the stats of the last one on the screen
   * until its own stats come.
   */
  agentStatsOf: (appId: string, workspaceId: string, period: StatsPeriod | null) =>
    queryOptions({
      queryKey: [...APPS_QUERY_ROOT, 'stats', 'one', period?.from, period?.to, appId] as const,
      queryFn: () => repository().getAgentStats(appId, period ?? undefined),
      enabled: !!appId && !!period && canReadStats(workspaceId),
      placeholderData: (previous: AgentStats | undefined) =>
        previous?.agentId === appId ? previous : undefined,
      refetchInterval: 60_000,
    }),
};

const invalidateApps = () => getQueryClient().invalidateQueries({ queryKey: APPS_QUERY_ROOT });

/**
 * The key of a query on one app ends with its id. A page stays open during the invalidation, and
 * the server refuses each read on a deleted app.
 */
const removeQueriesOfApp = (appId: string) =>
  getQueryClient().removeQueries({
    queryKey: APPS_QUERY_ROOT,
    predicate: query => query.queryKey.at(-1) === appId,
  });

export const appMutations = {
  /** Gives the first join code: the page shows it once. */
  create: (workspaceId: string) =>
    mutationOptions({
      mutationKey: CREATE_APP_MUTATION_KEY,
      mutationFn: ({ name, runner, projectIds = [] }: NewApp) =>
        repository().createApp(workspaceId, name.trim(), runner, projectIds),
      onSuccess: () => invalidateApps(),
    }),

  /** With a `name`, the toast names the app. */
  remove: (kind: 'app' | 'agent' = 'app', name?: string) =>
    mutationOptions({
      mutationFn: (appId: string) => repository().deleteApp(appId),
      onSuccess: (_result, appId) => {
        const deleted = kind === 'agent' ? appsMessages.agentDeleted : appsMessages.deleted;
        toast.success(i18n._(name ? appsMessages.namedDeleted(name) : deleted));
        removeQueriesOfApp(appId);
        return invalidateApps();
      },
    }),

  joinCode: () =>
    mutationOptions({
      mutationFn: (appId: string) => repository().createJoinCode(appId),
    }),

  renameKey: () =>
    mutationOptions({
      mutationFn: ({ appId, keyId, label }: { appId: string; keyId: string; label: string }) =>
        repository().renameKey(appId, keyId, label.trim()),
      onSuccess: (_key, { appId }) => {
        toast.success(i18n._(appsMessages.keyRenamed));
        return getQueryClient().invalidateQueries({ queryKey: APP_QUERY_KEY(appId) });
      },
    }),

  /** Gives and takes back the role `runner` of an agent, the grants first. */
  changeAccess: (workspaceId: string) =>
    mutationOptions({
      mutationFn: ({ appId, changes }: { appId: string; changes: readonly RunnerChange[] }) =>
        repository().changeRunner(workspaceId, appId, changes),
      onSuccess: () => {
        toast.success(i18n._(appsMessages.accessChanged));
        const client = getQueryClient();
        return Promise.all([
          client.invalidateQueries({ queryKey: ['access'] }),
          client.invalidateQueries({ queryKey: [...APPS_QUERY_ROOT, 'access'] }),
        ]);
      },
    }),

  /** A disabled app gets no token and no job; its running jobs stop. */
  disable: () =>
    mutationOptions({
      mutationFn: (appId: string) => repository().disableApp(appId),
      onSuccess: app => {
        toast.success(i18n._(appsMessages.disabledToast(app.name)));
        return invalidateApps();
      },
    }),

  enable: () =>
    mutationOptions({
      mutationFn: (appId: string) => repository().enableApp(appId),
      onSuccess: app => {
        toast.success(i18n._(appsMessages.enabledToast(app.name)));
        return invalidateApps();
      },
    }),

  revokeKey: () =>
    mutationOptions({
      mutationFn: ({ appId, keyId }: { appId: string; keyId: string }) =>
        repository().revokeKey(appId, keyId),
      onSuccess: (_result, { appId }) => {
        toast.success(i18n._(appsMessages.keyRevoked));
        return getQueryClient().invalidateQueries({ queryKey: APP_QUERY_KEY(appId) });
      },
    }),
};
