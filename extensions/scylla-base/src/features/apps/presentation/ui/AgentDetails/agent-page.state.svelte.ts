import { can, Permission } from '@platform/authz';
import { contextStore, scyllaNavigate } from '@platform/context';
import { createMutation, createQuery } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import { sessionUserId } from '@base/features/login';
import { appStateOf } from '@base/features/apps/domain/entities/app.entity.ts';
import { hasNoActiveKey } from '@base/features/apps/domain/structs/agent-list.struct.ts';
import { appMutations, appQueries } from '@base/features/apps/presentation/apps.queries.ts';
import { createAgentStats } from './agent-stats.state.svelte.ts';
import { createAgentTab, type AgentTab } from './agent-tab.state.svelte.ts';

const context = toRune(contextStore);

/** The jobs of the overview. */
export const RECENT_JOBS = 5;

/**
 * The agent page: the agent, what the user may do with it, the open tab, and the dialogs that
 * every tab and the menu of the header open.
 */
export const createAgentPage = (appId: () => string) => {
  const workspaceId = $derived(context().workspace.id ?? '');
  const target = $derived({ workspaceId });

  const canManage = $derived(can(Permission.DELETE_APP, target));
  const canReadAccess = $derived(can(Permission.LIST_WORKSPACE_MEMBERS, target));
  const canChangeAccess = $derived(
    can(Permission.MANAGE_WORKSPACE_GRANTS, target) &&
      can(Permission.MANAGE_PROJECT_GRANTS, target),
  );
  const canReadJobs = $derived(can(Permission.LIST_JOBS_BY_WORKSPACE, target));
  // The stats need their own permission: a reader of the apps can miss it.
  const canReadStats = $derived(can(Permission.READ_APP_STATS, target));

  const details = createQuery(() => appQueries.byId(appId(), workspaceId));
  const recent = createQuery(() =>
    appQueries.jobPage(workspaceId, appId(), { limit: RECENT_JOBS }, canReadJobs),
  );
  const accessQuery = createQuery(() =>
    appQueries.agentAccess(workspaceId, appId() ? [appId()] : [], canReadAccess),
  );
  const disable = createMutation(() => appMutations.disable());
  const enable = createMutation(() => appMutations.enable());

  const agent = $derived(details.data?.app);
  const keys = $derived(details.data?.keys ?? []);
  const never = $derived(!!agent && appStateOf(agent) === 'never' && !agent.disabledAt);

  // The server gives these rights to the creator of the agent too.
  const userId = sessionUserId() ?? '';
  const created = $derived(!!userId && agent?.createdBy === userId);
  const canNewCode = $derived(created || can(Permission.CREATE_JOIN_CODE, target));

  const stats = createAgentStats(() => ({ appId: appId(), workspaceId, agent }));
  const tabs = $derived<AgentTab[]>([
    'overview',
    ...(canReadJobs ? (['jobs'] as const) : []),
    ...(canReadStats ? (['activity'] as const) : []),
    'settings',
    'machine',
  ]);
  const tab = createAgentTab(() => tabs);

  let disabling = $state(false);
  let deleting = $state(false);
  let iconOpen = $state(false);
  let iconAvatar = $state(false);

  return {
    get workspaceId() {
      return workspaceId;
    },
    get workspaceName() {
      return context().workspace.name ?? '';
    },
    get details() {
      return details;
    },
    get agent() {
      return agent;
    },
    get keys() {
      return keys;
    },
    get noActiveKey() {
      return hasNoActiveKey(keys);
    },
    /** It never said hello, and it is not disabled. */
    get never() {
      return never;
    },
    /** Newest first. `undefined` while they load. */
    get recentJobs() {
      return recent.data?.jobs;
    },
    get access() {
      return agent ? accessQuery.data?.get(agent.id) : undefined;
    },
    get stats() {
      return stats;
    },
    get tabs() {
      return tabs;
    },
    get tab() {
      return tab;
    },

    get canManage() {
      return canManage;
    },
    get canReadAccess() {
      return canReadAccess;
    },
    get canChangeAccess() {
      return canChangeAccess;
    },
    get canReadJobs() {
      return canReadJobs;
    },
    get canReadStats() {
      return canReadStats;
    },
    get canSetLabels() {
      return can(Permission.SET_APP_LABELS, target);
    },
    get canSetIcon() {
      return can(Permission.SET_APP_ICON, target);
    },
    get canNewCode() {
      return canNewCode;
    },
    get canRename() {
      return created || can(Permission.RENAME_APP_KEY, target);
    },
    get canRevoke() {
      return created || can(Permission.REVOKE_APP_KEY, target);
    },

    get disabling() {
      return disabling;
    },
    set disabling(open: boolean) {
      disabling = open;
    },
    get deleting() {
      return deleting;
    },
    set deleting(open: boolean) {
      deleting = open;
    },
    get iconOpen() {
      return iconOpen;
    },
    set iconOpen(open: boolean) {
      iconOpen = open;
    },
    /** The icon dialog opens on the Avatar tab: "Make an avatar". */
    get iconAvatar() {
      return iconAvatar;
    },
    openIcon(avatar = false) {
      iconAvatar = avatar;
      iconOpen = true;
    },

    get isDisabling() {
      return disable.isPending;
    },
    get isEnabling() {
      return enable.isPending;
    },
    confirmDisable() {
      if (agent) disable.mutate(agent.id, { onSuccess: () => (disabling = false) });
    },
    enable() {
      if (agent) enable.mutate(agent.id);
    },
    /** The install step of the agent, with a new join code. */
    connect() {
      scyllaNavigate.goToWorkspaceRoute(`/agents/${appId()}/connect`);
    },
  };
};

export type AgentPage = ReturnType<typeof createAgentPage>;
