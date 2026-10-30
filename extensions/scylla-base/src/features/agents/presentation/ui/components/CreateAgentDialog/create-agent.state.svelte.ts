import { Permission, PermissionScope, PrincipalKind, can } from '@platform/authz';
import { contextStore } from '@platform/context';
import { createMutation, createQuery } from '@scylla/core-sdk';
import { prefersReducedMotion } from '@scylla/ui';
import { toRune } from '@scylla/ui/stores';
import { canListProjects, projectQueries } from '@base/features/project';
import { grantMutations, roleQueries } from '@base/features/roles';
import type {
  AgentEntity,
  CreatedAgent,
} from '@base/features/agents/domain/entities/agent.entity.ts';
import { agentMutations, agentQueries } from '@base/features/agents/presentation/agents.queries.ts';

/** Where the new agent takes jobs. */
export type AgentReach = 'project' | 'organization';

/** The "One project" option. `hidden`: the user may not list the projects, or may give none. */
export type ProjectOption = 'hidden' | 'loading' | 'error' | 'ready';

/** `created`: the call passed, "Created" shows. `start`: step 2. */
export type CreationPhase = 'form' | 'creating' | 'created' | 'start';

export const PROJECT_AGENT_ROLE = 'project-agent';
export const ORGANIZATION_AGENT_ROLE = 'organization-agent';

/** How long "Created" shows before step 2 comes in. */
export const VALIDATION_MS = 700;

const LIVE_STATUS_MS = 2000;
const NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,63}$/;

/** `connected` can lag a fast restart: a `last_seen` proves a first connection too. */
export const hasConnected = (agent: Pick<AgentEntity, 'connected' | 'lastSeen'>): boolean =>
  agent.connected || !!agent.lastSeen;

/** The `GetAgent` poll of step 2. It stops on an error: each failed refetch shows a toast. */
export const liveStatusInterval = (state: {
  data: AgentEntity | undefined;
  status: 'pending' | 'error' | 'success';
}): number | false =>
  state.status === 'error' || (state.data && hasConnected(state.data)) ? false : LIVE_STATUS_MS;

/**
 * The two steps of a new agent. `CreateAgent` grants `organization-agent` on the organization;
 * for one project, a `project-agent` grant on it follows, then the organization grant goes. A
 * failed grant step does not stop the flow: the secret exists and shows only in step 2.
 */
export const createAgentCreation = () => {
  const context = toRune(contextStore);
  const organizationId = $derived(context().organization.id ?? '');
  const organizationName = $derived(context().organization.name ?? '');

  /** `ListGrants` and `RevokeGrant` of the organization grant need `MANAGE_ORG_GRANTS`. */
  const canManageOrganization = $derived(can(Permission.MANAGE_ORG_GRANTS, { organizationId }));
  const canList = $derived(canListProjects(organizationId));

  const projectsQuery = createQuery(() => ({
    ...projectQueries.lookup(organizationId),
    enabled: canManageOrganization && canList,
  }));
  const organizationGrants = createQuery(() =>
    roleQueries.scopedGrants(PermissionScope.ORGANIZATION, organizationId, { enabled: false }),
  );

  const createAgent = createMutation(() => agentMutations.create(organizationId));
  const createGrant = createMutation(() => grantMutations.create());
  const revokeGrant = createMutation(() => grantMutations.revoke());

  let name = $state('');
  let chosenReach = $state<AgentReach | null>(null);
  let chosenProjectId = $state<string | null>(null);
  let phase = $state<CreationPhase>('form');
  let created = $state<CreatedAgent | null>(null);
  let grantFailed = $state(false);

  /** The project grant needs `MANAGE_PROJECT_GRANTS` on its project. */
  const projects = $derived(
    (projectsQuery.data?.items ?? []).filter(project =>
      can(Permission.MANAGE_PROJECT_GRANTS, { organizationId, projectId: project.id }),
    ),
  );
  const projectOption = $derived.by((): ProjectOption => {
    if (!canManageOrganization || !canList) return 'hidden';
    if (projectsQuery.data) return projects.length > 0 ? 'ready' : 'hidden';
    return projectsQuery.isError ? 'error' : 'loading';
  });
  const projectOpen = $derived(projectOption === 'loading' || projectOption === 'ready');
  /** Never "All projects" because the list did not load: then the user chooses it. */
  const reach = $derived.by((): AgentReach | null => {
    if (projectOption === 'hidden' || chosenReach === 'organization') return 'organization';
    return projectOpen ? 'project' : null;
  });
  const projectId = $derived(
    projects.find(project => project.id === chosenProjectId)?.id ?? projects[0]?.id ?? null,
  );
  const trimmedName = $derived(name.trim());
  const nameValid = $derived(NAME_PATTERN.test(trimmedName));

  const agentId = $derived(created?.agent.id ?? '');
  const canWatch = $derived(can(Permission.READ_APP));
  const liveQuery = createQuery(() => ({
    ...agentQueries.byId(agentId),
    enabled: phase === 'start' && !!agentId && canWatch,
    refetchInterval: (query: { state: Parameters<typeof liveStatusInterval>[0] }) =>
      liveStatusInterval(query.state),
  }));
  const liveAgent = $derived(liveQuery.data);

  const scopeToProject = async (newAgentId: string, project: string): Promise<boolean> => {
    try {
      await createGrant.mutateAsync({
        principal: { kind: PrincipalKind.APP, id: newAgentId },
        roleId: PROJECT_AGENT_ROLE,
        scope: PermissionScope.PROJECT,
        scopeId: project,
      });
      const { data: grants } = await organizationGrants.refetch();
      const organizationGrant = grants?.find(
        grant =>
          grant.principal.kind === PrincipalKind.APP &&
          grant.principal.id === newAgentId &&
          grant.roleId === ORGANIZATION_AGENT_ROLE,
      );
      if (!organizationGrant) return false;
      await revokeGrant.mutateAsync(organizationGrant.id);
      return true;
    } catch {
      // The global handler toasts the error; step 2 says what it means.
      return false;
    }
  };

  return {
    get organizationName() {
      return organizationName;
    },
    get projects() {
      return projects;
    },
    get projectOption() {
      return projectOption;
    },
    retryProjects: () => void projectsQuery.refetch(),
    get name() {
      return name;
    },
    set name(value: string) {
      name = value;
    },
    /** Shown once the name holds something: an empty field is not an error yet. */
    get nameInvalid() {
      return trimmedName !== '' && !nameValid;
    },
    get reach(): AgentReach | null {
      return reach;
    },
    set reach(value: AgentReach) {
      if (value === 'organization' || projectOpen) chosenReach = value;
    },
    get projectId() {
      return projectId;
    },
    set projectId(value: string | null) {
      chosenProjectId = value;
    },
    get canSubmit() {
      return (
        phase === 'form' &&
        nameValid &&
        (reach === 'organization' || (reach === 'project' && !!projectId))
      );
    },
    get phase() {
      return phase;
    },
    get step(): 1 | 2 {
      return phase === 'start' ? 2 : 1;
    },
    /** Shown one time, in step 2. */
    get created() {
      return created;
    },
    get grantFailed() {
      return grantFailed;
    },
    get canWatch() {
      return canWatch;
    },
    get liveAgent() {
      return liveAgent;
    },
    get connected() {
      return !!liveAgent && hasConnected(liveAgent);
    },

    submit: async () => {
      if (phase !== 'form' || !nameValid || reach === null) return;
      const target = reach === 'project' ? projectId : null;
      if (reach === 'project' && !target) return;

      phase = 'creating';
      let result: CreatedAgent;
      try {
        result = await createAgent.mutateAsync({ name: trimmedName });
      } catch {
        // The global handler toasts the server message; the form stays as it was.
        phase = 'form';
        return;
      }

      created = result;
      if (target) grantFailed = !(await scopeToProject(result.agent.id, target));

      phase = 'created';
      await new Promise(resolve => setTimeout(resolve, prefersReducedMotion() ? 0 : VALIDATION_MS));
      phase = 'start';
    },
  };
};

export type AgentCreation = ReturnType<typeof createAgentCreation>;
