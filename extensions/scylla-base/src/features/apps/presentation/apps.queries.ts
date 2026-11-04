import { getModuleDomain, getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import { i18n } from '@lingui/core';
import { Permission, authorizationReady, can } from '@platform/authz';
import { toast } from '@scylla/ui/utils';
import type { AppsModule } from '../apps.module.ts';
import { appsMessages } from './messages/apps.messages.ts';
import { appStatsOf } from '../domain/structs/app-stats.struct.ts';

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

export const appQueries = {
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
        !!appId &&
        authorizationReady() &&
        can(Permission.READ_APP, { workspaceId: workspaceId }),
      refetchInterval: 15_000,
    }),

  /** An app that the add dialog waits for: it reads it every 2 s until the agent connects. */
  waiting: (appId: string, workspaceId: string) =>
    queryOptions({
      ...appQueries.byId(appId, workspaceId),
      refetchInterval: query => (query.state.data?.app.connected ? false : 2_000),
    }),

  jobs: (workspaceId: string, appId: string, enabled = true) =>
    queryOptions({
      queryKey: APP_JOBS_QUERY_KEY(appId),
      queryFn: () => repository().listJobs(workspaceId, appId, RECENT_JOBS),
      enabled: enabled && !!workspaceId && !!appId,
    }),
};

/** The stats of an agent, from its recent jobs. */
const statsQuery = (workspaceId: string, appId: string) => ({
  ...appQueries.jobs(workspaceId, appId, !!appId && canList(workspaceId)),
  select: appStatsOf,
});

export const appStatsQueries = { of: statsQuery };

const invalidateApps = () => getQueryClient().invalidateQueries({ queryKey: APPS_QUERY_ROOT });

export const appMutations = {
  /** Gives the first join code: the dialog shows it once. */
  create: (workspaceId: string) =>
    mutationOptions({
      mutationKey: CREATE_APP_MUTATION_KEY,
      mutationFn: ({ name, runner, projectIds = [] }: NewApp) =>
        repository().createApp(workspaceId, name.trim(), runner, projectIds),
      onSuccess: () => invalidateApps(),
    }),

  remove: () =>
    mutationOptions({
      mutationFn: (appId: string) => repository().deleteApp(appId),
      onSuccess: (_result, appId) => {
        toast.success(i18n._(appsMessages.deleted));
        getQueryClient().removeQueries({ queryKey: APP_QUERY_KEY(appId), exact: true });
        return invalidateApps();
      },
    }),

  joinCode: () =>
    mutationOptions({
      mutationFn: (appId: string) => repository().createJoinCode(appId),
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
