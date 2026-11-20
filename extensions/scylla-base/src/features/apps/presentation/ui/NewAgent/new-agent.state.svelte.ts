import { untrack } from 'svelte';
import { can, Permission } from '@platform/authz';
import { scyllaNavigate } from '@platform/context';
import { createMutation, createQuery, getQueryClient } from '@scylla/core-sdk';
import {
  appStateOf,
  type AppEntity,
  type CreatedApp,
  type JoinCode,
} from '@base/features/apps/domain/entities/app.entity.ts';
import {
  appMutations,
  appQueries,
  hasJoined,
  isJoining,
} from '@base/features/apps/presentation/apps.queries.ts';

export type AgentStep = 'name' | 'install' | 'connected';

interface NewAgentInput {
  workspaceId: string;
  /** Absent: step 1 makes a new agent. Present: the page connects this agent. */
  appId: string;
}

/** Zero: each project. `null`: not known here. */
type ProjectCount = number | null;

/**
 * The agent that step 1 made, for the page of its new URL: the route changes, so the page mounts
 * again. It keeps the join code of the creation, which a new code would stop.
 */
let created: (CreatedApp & { projectCount: ProjectCount }) | null = null;

const take = (appId: string) => {
  const entry = created?.app.id === appId ? created : null;
  created = null;
  return entry;
};

export const connectPath = (appId: string) => `/agents/${appId}/connect`;

/** The ViewModel of the page of a new agent, and of the connection of an agent that exists. */
export const createNewAgent = (input: () => NewAgentInput) => {
  const workspaceId = () => input().workspaceId;
  const appId = untrack(() => input().appId);
  const handed = appId ? take(appId) : null;

  let name = $state('');
  let someProjects = $state(false);
  let projectIds = $state<string[]>([]);
  /** The agent when the page opened. */
  let agent = $state<AppEntity | null>(handed?.app ?? null);
  let joinCode = $state<JoinCode | null>(handed?.joinCode ?? null);
  let keysBefore = $state<number | null>(handed ? 0 : null);
  let failed = $state(false);

  const create = createMutation(() => appMutations.create(workspaceId()));
  const renew = createMutation(() => appMutations.joinCode());
  const remove = createMutation(() => appMutations.remove('agent', agent?.name));
  const deleting = $derived(remove.isPending || remove.isSuccess);

  const canReadAccess = $derived(
    can(Permission.LIST_WORKSPACE_MEMBERS, { workspaceId: workspaceId() }),
  );
  const access = createQuery(() =>
    appQueries.agentAccess(workspaceId(), [appId], !handed && !!appId && canReadAccess),
  );
  const watched = createQuery(() => {
    const options = appQueries.waiting(appId, workspaceId(), keysBefore ?? 0);
    return {
      ...options,
      // A deleted agent: each read would fail.
      enabled: !!joinCode && keysBefore !== null && !deleting && !!options.enabled,
    };
  });

  const mayMakeCode = (app: AppEntity) =>
    app.createdBy === (localStorage.getItem('userId') ?? '') ||
    can(Permission.CREATE_JOIN_CODE, { workspaceId: workspaceId() });

  const newCode = () => {
    if (!appId) return;
    renew.mutate(appId, { onSuccess: code => (joinCode = code) });
  };

  // A reload, or "Finish setup": a new code, and the keys of now to see the next join.
  if (appId && !handed) {
    getQueryClient()
      .fetchQuery(appQueries.byId(appId, untrack(workspaceId)))
      .then(details => {
        if (!mayMakeCode(details.app)) {
          scyllaNavigate.goToWorkspaceRoute(`/agents/${appId}`, { replace: true });
          return;
        }
        agent = details.app;
        keysBefore = details.keys.length;
        newCode();
      })
      .catch(() => (failed = true));
  }

  const live = $derived(watched.data?.app ?? agent);
  const connected = $derived(hasJoined(watched.data, keysBefore ?? 0));
  const joining = $derived(isJoining(watched.data, keysBefore ?? 0));
  const step = $derived<AgentStep>(!appId ? 'name' : connected ? 'connected' : 'install');
  /** The agent never had a machine: the page made it, or "Finish setup" opened it. */
  const firstMachine = $derived(!!agent && appStateOf(agent) === 'never');

  const canAdd = $derived(
    !!name.trim() && (!someProjects || projectIds.length > 0) && !create.isPending,
  );

  const projectCount = $derived.by((): ProjectCount => {
    if (handed) return handed.projectCount;
    const value = access.data?.get(appId);
    if (value?.kind === 'all') return 0;
    return value?.kind === 'some' ? value.projects.length : null;
  });

  return {
    get step() {
      return step;
    },
    get agent() {
      return live;
    },
    get firstMachine() {
      return firstMachine;
    },
    /** No machine joined an agent that never had one: to leave now leaves it unused. */
    get waitsForMachine() {
      return step === 'install' && firstMachine && !joining;
    },
    get joining() {
      return joining;
    },
    get deleting() {
      return deleting;
    },
    /** Deletes the agent of the page. */
    remove: () => remove.mutateAsync(appId),
    get joinCode() {
      return joinCode;
    },
    get renewing() {
      return renew.isPending;
    },
    get failed() {
      return failed;
    },
    get accessGranted() {
      return handed?.accessGranted ?? true;
    },
    get projectCount() {
      return projectCount;
    },
    get name() {
      return name;
    },
    set name(value: string) {
      name = value;
    },
    get someProjects() {
      return someProjects;
    },
    set someProjects(value: boolean) {
      someProjects = value;
    },
    get projectIds() {
      return projectIds;
    },
    set projectIds(value: string[]) {
      projectIds = value;
    },
    get canAdd() {
      return canAdd;
    },
    newCode,
    add() {
      if (!canAdd) return;
      const chosen = someProjects ? projectIds : [];
      create.mutate(
        { name, runner: true, projectIds: chosen },
        {
          onSuccess: result => {
            created = { ...result, projectCount: chosen.length };
            scyllaNavigate.goToWorkspaceRoute(connectPath(result.app.id), { replace: true });
          },
        },
      );
    },
  };
};
