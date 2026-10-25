import { Permission, PermissionScope, PrincipalKind, can } from '@platform/authz';
import { contextStore } from '@platform/context';
import { createMutation, createQuery, getQueryClient } from '@scylla/core-sdk';
import { activeLocale, t } from '@scylla/ui/i18n';
import { toRune } from '@scylla/ui/stores';
import { toast } from '@scylla/ui/utils';
import { APP_ACCESS_QUERY_KEY, appQueries, type AppAccess } from '@base/features/apps';
import { canListProjects, projectQueries } from '@base/features/project';
import { grantMutations } from '@base/features/roles';
import type { AgentEntity } from '@base/features/agents/domain/entities/agent.entity.ts';
import { accessCardMessages as messages } from '@base/features/agents/presentation/messages/access-card.messages.ts';
import {
  coversEveryProject,
  keepsCover,
  orderGrants,
  projectGrantsIn,
  projectLabel,
  projectsWithoutGrant,
} from '@base/features/agents/presentation/presenters/access.presenter.ts';
import {
  ORGANIZATION_AGENT_ROLE,
  PROJECT_AGENT_ROLE,
  type AgentReach,
} from '@base/features/agents/presentation/ui/components/CreateAgentDialog/create-agent.state.svelte.ts';

const HIGHLIGHT_MS = 2400;

/** `denied`: no `LIST_PROJECTS_BY_ORGANIZATION`, thus no list to pick from. */
export type ProjectsStatus = 'loading' | 'error' | 'denied' | 'ready';

interface Removal {
  grant: AppAccess;
  /** The grants when the dialog opened: the list keeps them while the revoke runs. */
  grants: AppAccess[];
}

/** CE keeps one grant per principal, role and scope. */
const keyOf = (grant: Pick<AppAccess, 'scope' | 'scopeId' | 'roleId'>) =>
  `${grant.scope}:${grant.scopeId}:${grant.roleId}`;

/**
 * A project grant needs `MANAGE_PROJECT_GRANTS` on its project, the organization grant
 * `MANAGE_ORG_GRANTS`. "All projects" grants first, then revokes the project grants that the user
 * may revoke: a failed revoke keeps more access, never less.
 */
export const createAgentAccess = (input: {
  agent: () => AgentEntity;
  access: () => AppAccess[] | undefined;
  organizationId: () => string;
}) => {
  const context = toRune(contextStore);
  const organizationName = $derived(context().organization.name ?? '');
  const organizationId = $derived(input.organizationId());

  const access = $derived(input.access() ?? []);
  const grants = $derived(orderGrants(access, organizationId));
  const everyProject = $derived(coversEveryProject(access, organizationId));
  const canManageOrganization = $derived(can(Permission.MANAGE_ORG_GRANTS, { organizationId }));
  const canManageProject = (projectId: string, inOrganization: string | null = organizationId) =>
    !!inOrganization &&
    can(Permission.MANAGE_PROJECT_GRANTS, { organizationId: inOrganization, projectId });
  const canList = $derived(canListProjects(organizationId));

  const accessQuery = createQuery(() => appQueries.accessOf(input.agent().id));
  const projectsQuery = createQuery(() => ({
    ...projectQueries.lookup(organizationId),
    enabled: canList && !everyProject,
  }));
  const createGrant = createMutation(() => grantMutations.create());
  const revokeGrant = createMutation(() => grantMutations.revoke());

  let giving = $state(false);
  let chosenReach = $state<AgentReach | null>(null);
  let chosenProjectId = $state<string | null>(null);
  let removal = $state<Removal | null>(null);
  let working = $state(false);
  let fresh = $state<string | null>(null);
  let freshTimer: ReturnType<typeof setTimeout> | undefined;
  let refocus = false;
  let focusRequest = $state(0);

  const projectsStatus = $derived.by((): ProjectsStatus => {
    if (!canList) return 'denied';
    if (projectsQuery.data) return 'ready';
    return projectsQuery.isError ? 'error' : 'loading';
  });
  const listed = $derived(projectsQuery.data?.projects ?? []);
  const withoutGrant = $derived(projectsWithoutGrant(listed, access));
  const projects = $derived(withoutGrant.filter(candidate => canManageProject(candidate.id)));
  const canPickProject = $derived(projectsStatus === 'ready' && projects.length > 0);
  /** Never "All projects" because the list is empty: the user picks it. */
  const reach = $derived<AgentReach | null>(
    chosenReach ?? (projectsStatus === 'loading' || canPickProject ? 'project' : null),
  );
  const project = $derived(
    projects.find(candidate => candidate.id === chosenProjectId) ?? projects[0] ?? null,
  );
  const replaced = $derived(
    reach === 'organization' ? projectGrantsIn(access, organizationId) : [],
  );
  const revocable = $derived(replaced.filter(grant => canManageProject(grant.scopeId)));

  const listOf = (names: string[]) =>
    new Intl.ListFormat(activeLocale(), { type: 'conjunction' }).format(names);

  const nameOf = (grant: AppAccess): string => {
    if (grant.scope === 'project') return projectLabel(grant, organizationId);
    if (grant.scope === 'system') return t(messages.allOrganizations);
    return grant.organizationId === organizationId
      ? t(messages.allProjects)
      : t(messages.allProjectsOf(grant.organizationName));
  };

  const refresh = (agentId: string) =>
    getQueryClient().invalidateQueries({ queryKey: APP_ACCESS_QUERY_KEY(agentId) });

  const highlight = (key: string) => {
    clearTimeout(freshTimer);
    fresh = key;
    freshTimer = setTimeout(() => (fresh = null), HIGHLIGHT_MS);
  };

  const giveProject = async (agent: AgentEntity, target: { id: string; name: string }) => {
    await createGrant.mutateAsync({
      principal: { kind: PrincipalKind.APP, id: agent.id },
      roleId: PROJECT_AGENT_ROLE,
      scope: PermissionScope.PROJECT,
      scopeId: target.id,
    });
    await refresh(agent.id);
    giving = false;
    highlight(keyOf({ scope: 'project', scopeId: target.id, roleId: PROJECT_AGENT_ROLE }));
    toast.success(t(messages.accessGiven), {
      description: t(messages.accessGivenProject(agent.name, target.name)),
    });
  };

  const giveOrganization = async (agent: AgentEntity, toRevoke: AppAccess[]) => {
    await createGrant.mutateAsync({
      principal: { kind: PrincipalKind.APP, id: agent.id },
      roleId: ORGANIZATION_AGENT_ROLE,
      scope: PermissionScope.ORGANIZATION,
      scopeId: organizationId,
    });
    const failed: AppAccess[] = [];
    for (const grant of toRevoke) {
      try {
        await revokeGrant.mutateAsync(grant.grantId);
      } catch {
        failed.push(grant);
      }
    }
    await refresh(agent.id);
    giving = false;
    highlight(
      keyOf({ scope: 'organization', scopeId: organizationId, roleId: ORGANIZATION_AGENT_ROLE }),
    );
    if (failed.length === 0) {
      toast.success(t(messages.accessGiven), {
        description: t(messages.accessGivenOrganization(agent.name, organizationName)),
      });
    } else {
      toast.warning(t(messages.accessGiven), {
        description: t(
          messages.replaceFailed(agent.name, organizationName, listOf(failed.map(nameOf))),
        ),
      });
    }
  };

  return {
    get organizationName() {
      return organizationName;
    },
    get grants() {
      return grants;
    },
    get accessFailed() {
      return accessQuery.isError && !accessQuery.data;
    },
    get accessRetrying() {
      return accessQuery.isFetching;
    },
    /** Disabled: without `READ_APP`, `accessOf` asks nothing. */
    get accessHidden() {
      return accessQuery.isPending && accessQuery.fetchStatus === 'idle';
    },
    retryAccess: () => void accessQuery.refetch(),
    /** The organization grant, or a project the user may give. */
    get canGiveAccess() {
      return (
        canManageOrganization || withoutGrant.some(candidate => canManageProject(candidate.id))
      );
    },
    get coversEveryProject() {
      return everyProject;
    },
    removable: (grant: AppAccess) => {
      if (grant.scope === 'project') return canManageProject(grant.scopeId, grant.organizationId);
      if (grant.scope === 'organization' && grant.organizationId) {
        return can(Permission.MANAGE_ORG_GRANTS, { organizationId: grant.organizationId });
      }
      return false;
    },
    isFresh: (grant: AppAccess) => fresh === keyOf(grant),
    nameOf,
    listOf,
    get working() {
      return working;
    },
    /** Grows when the card must take the focus: the control that opened the dialog is gone. */
    get focusRequest() {
      return focusRequest;
    },
    returnFocus: (event: Event) => {
      if (!refocus) return;
      refocus = false;
      event.preventDefault();
      focusRequest += 1;
    },

    get giving() {
      return giving;
    },
    get projectsStatus() {
      return projectsStatus;
    },
    retryProjects: () => void projectsQuery.refetch(),
    /** The projects without a grant that the user may give. */
    get projects() {
      return projects;
    },
    /** Projects without a grant that the user may not give. */
    get projectsOutOfReach() {
      return projectsStatus === 'ready' && projects.length === 0 && withoutGrant.length > 0;
    },
    /** `PROJECTS_LOOKUP_PAGE` cuts the list. */
    get projectsCut() {
      const total = projectsQuery.data?.pagination?.totalCount ?? 0;
      return total > listed.length ? listed.length : null;
    },
    get canPickProject() {
      return canPickProject;
    },
    get canPickOrganization() {
      return canManageOrganization && !everyProject;
    },
    get reach() {
      return reach;
    },
    set reach(value: AgentReach | null) {
      chosenReach = value;
    },
    get projectId() {
      return project?.id ?? null;
    },
    set projectId(value: string | null) {
      chosenProjectId = value;
    },
    /** The project grants that "All projects" revokes. */
    get replaced() {
      return revocable;
    },
    /** The project grants that "All projects" keeps: the user may not revoke them. */
    get kept() {
      return replaced.filter(grant => !revocable.includes(grant));
    },
    get canGive() {
      if (working) return false;
      if (reach === 'organization') return canManageOrganization && !everyProject;
      return reach === 'project' && canPickProject && !!project;
    },
    requestGive: () => {
      chosenReach = null;
      chosenProjectId = null;
      giving = true;
    },
    closeGive: () => {
      if (!working) giving = false;
    },
    give: async () => {
      if (working) return;
      const agent = input.agent();
      const target = reach === 'project' && canPickProject ? project : null;
      if (!target && !(reach === 'organization' && canManageOrganization && !everyProject)) return;

      working = true;
      try {
        if (target) await giveProject(agent, target);
        else await giveOrganization(agent, revocable);
      } catch {
        // The global handler toasts the server message; the dialog stays open.
      } finally {
        working = false;
      }
    },

    get removing() {
      return removal?.grant ?? null;
    },
    get removalGrants() {
      return removal?.grants ?? [];
    },
    get removesLastAccess() {
      return removal?.grants.length === 1;
    },
    /** A running job under the removed grant cannot report its result any more. */
    get removalStrandsJobs() {
      return !!removal && !keepsCover(removal.grants, removal.grant);
    },
    requestRemove: (grant: AppAccess) => (removal = { grant, grants }),
    cancelRemove: () => {
      if (!working) removal = null;
    },
    confirmRemove: async () => {
      if (!removal || working) return;
      const { grant } = removal;
      const agent = input.agent();

      working = true;
      try {
        await revokeGrant.mutateAsync(grant.grantId);
        await refresh(agent.id);
        refocus = true;
        removal = null;
        toast.success(t(messages.accessRemoved), {
          description:
            grant.scope === 'project'
              ? t(messages.accessRemovedProject(agent.name, nameOf(grant)))
              : t(messages.accessRemovedOrganization(agent.name, grant.organizationName)),
        });
      } catch {
        // The global handler toasts the server message; the dialog stays open.
      } finally {
        working = false;
      }
    },
  };
};

export type AgentAccess = ReturnType<typeof createAgentAccess>;
