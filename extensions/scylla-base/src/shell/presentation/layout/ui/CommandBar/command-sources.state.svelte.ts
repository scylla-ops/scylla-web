import type { MessageDescriptor, Messages } from '@lingui/core';
import { can, Permission } from '@platform/authz';
import { contextStore } from '@platform/context';
import { createQuery } from '@scylla/core-sdk';
import { activeLocale, plainMessage, readCatalogs } from '@scylla/ui/i18n';
import { toRune } from '@scylla/ui/stores';
import { accessQueries, workspaceRef } from '@base/features/access';
import { appQueries } from '@base/features/apps';
import { dashboardQueries } from '@base/features/dashboard';
import { fragmentQueries, pipelineQueries } from '@base/features/pipeline';
import { projectGroupQueries, projectQueries } from '@base/features/project';
import { roleQueries } from '@base/features/roles';
import { secretQueries } from '@base/features/secret';
import { userQueries } from '@base/features/user';
import { workspaceQueries } from '@base/features/workspace';
import type { CommandSourcesData, CommandGroupId } from './command-rows.presenter.ts';

/**
 * TanStack tells only the changes of the fields that were read. The state of a list is read at the
 * first key, so a list that fails before it would stay "loading".
 */
const allChanges = <T extends object>(options: T) => ({
  ...options,
  notifyOnChangeProps: 'all' as const,
});

/** The lists of the bar: each one reads only with its permission, and only while the bar is open. */
export const createCommandSources = () => {
  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id);
  const projectId = $derived(context().project.id);
  const target = $derived({ workspaceId: workspaceId ?? undefined });

  const projects = createQuery(() =>
    allChanges({
      ...projectQueries.lookup(workspaceId),
      enabled: !!workspaceId && can(Permission.LIST_PROJECTS_BY_WORKSPACE, target),
    }),
  );
  // The groups give their rows, and "New project in <group>" to a person who can create one.
  const groups = createQuery(() =>
    allChanges({
      ...projectGroupQueries.list(workspaceId ?? ''),
      enabled:
        !!workspaceId &&
        (can(Permission.LIST_PROJECTS_BY_WORKSPACE, target) || can(Permission.CREATE_PROJECT, target)),
    }),
  );
  const pipelines = createQuery(() =>
    allChanges({
      ...pipelineQueries.allOfWorkspace(workspaceId),
      enabled: !!workspaceId && can(Permission.LIST_PIPELINES_BY_WORKSPACE, target),
    }),
  );
  const fragments = createQuery(() =>
    allChanges({
      ...fragmentQueries.list(workspaceId),
      enabled: !!workspaceId && can(Permission.LIST_PIPELINES_BY_WORKSPACE, target),
    }),
  );
  // It only reads, and starts from the set of the dashboard page when the cache has it.
  const dashboards = createQuery(() =>
    allChanges({
      ...dashboardQueries.list(workspaceId),
      enabled: !!workspaceId && can(Permission.READ_WORKSPACE, target),
    }),
  );
  const apps = createQuery(() =>
    allChanges({
      ...appQueries.list(workspaceId ?? ''),
      enabled: !!workspaceId && can(Permission.LIST_APPS_BY_WORKSPACE, target),
    }),
  );
  const members = createQuery(() =>
    allChanges(
      accessQueries.members(workspaceId ? workspaceRef(workspaceId) : null, {
        enabled: can(Permission.LIST_WORKSPACE_MEMBERS, target),
      }),
    ),
  );
  const workspaceRoles = createQuery(() =>
    allChanges(roleQueries.list(workspaceId ?? undefined, { enabled: !!workspaceId })),
  );
  const instanceRoles = createQuery(() => allChanges(roleQueries.list()));
  const secrets = createQuery(() =>
    allChanges({
      ...secretQueries.byProject(projectId ?? ''),
      enabled: !!projectId && can(Permission.LIST_SECRETS, { projectId }),
    }),
  );
  const workspaces = createQuery(() => allChanges(workspaceQueries.mine()));
  // The session: the shell has read it already.
  const me = createQuery(() => userQueries.me());

  const reads: readonly { group: CommandGroupId; query: { isLoading: boolean; isError: boolean } }[] =
    [
      { group: 'projects', query: projects },
      { group: 'groups', query: groups },
      { group: 'pipelines', query: pipelines },
      { group: 'fragments', query: fragments },
      { group: 'dashboards', query: dashboards },
      { group: 'machines', query: apps },
      { group: 'people', query: members },
      { group: 'roles', query: workspaceRoles },
      { group: 'roles', query: instanceRoles },
      { group: 'secrets', query: secrets },
      { group: 'workspaces', query: workspaces },
    ];

  const data = $derived<CommandSourcesData>({
    projects: projects.data?.items ?? [],
    groups: groups.data ?? [],
    pipelines: pipelines.data?.items ?? [],
    fragments: fragments.data ?? [],
    dashboards: dashboards.data,
    apps: apps.data ?? [],
    members: members.data ?? [],
    workspaceRoles: workspaceRoles.data ?? [],
    instanceRoles: instanceRoles.data ?? [],
    secrets: secrets.data ?? [],
    workspaces: workspaces.data ?? [],
    selfId: me.data?.id,
  });

  let otherCatalog = $state.raw<Messages>({});

  // The user can type a word of the other language: the catalogs load once the bar opens.
  $effect(() => {
    const other = activeLocale() === 'fr' ? 'en' : 'fr';
    void readCatalogs(other)
      .then(catalog => {
        otherCatalog = catalog;
      })
      .catch(() => undefined);
  });

  return {
    get data() {
      return data;
    },
    get loading() {
      return reads.some(({ query }) => query.isLoading);
    },
    get failed() {
      const groups = reads.filter(({ query }) => query.isError).map(({ group }) => group);
      return groups.filter((group, index) => groups.indexOf(group) === index);
    },
    other: (message: MessageDescriptor | undefined) => plainMessage(otherCatalog, message?.id),
  };
};
