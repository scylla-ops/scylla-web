import { i18n } from '@lingui/core';
import { can, Permission, PermissionScope } from '@platform/authz';
import { contextStore } from '@platform/context';
import { createQuery } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import { toast } from '@scylla/ui/utils';
import { organizationQueries } from '@base/features/organization';
import { invalidateProjectMembers, projectQueries } from '@base/features/project';
import { roleConfers, roleQueries } from '@base/features/roles';
import type { UserSummary } from '@base/features/user';
import { userName, type MissingUser } from '@shared/presentation/ui';
import {
  buildProjectMembers,
  MemberRoleOrigin,
  type ScopeMember,
} from '@base/features/membership/presentation/presenters/scope-members.presenter.ts';
import { createAssignableRoles } from '@base/features/membership/presentation/ui/components/assignable-roles.state.svelte.ts';
import {
  createScopeMembership,
  type PendingRemoval,
} from '@base/features/membership/presentation/ui/scope-membership.state.svelte.ts';
import type { ProjectMembersContext } from '@base/features/membership/presentation/membership.points.ts';
import { membershipMessages } from '@base/features/membership/presentation/messages/membership.messages.ts';

/**
 * The members page of a project: its own grants, the organization roles that reach it, the
 * candidates, and the operations on them. `projectId` is a getter: the route gives it after the
 * first render, and a direct URL can land here before the context agrees with it.
 */
export const createProjectMembersPage = (projectId: () => string | undefined) => {
  const context = toRune(contextStore);
  const organizationId = $derived(context().organization.id);
  // About this project, not the context's.
  const target = $derived({
    projectId: projectId() ?? undefined,
    organizationId: organizationId ?? undefined,
  });

  const canManage = $derived(can(Permission.MANAGE_PROJECT_GRANTS, target));
  // Inherited roles need the organization's grants (organization admins only).
  const canReadOrganizationGrants = $derived(can(Permission.MANAGE_ORG_GRANTS, target));
  const canListOrganizationMembers = $derived(can(Permission.LIST_ORGANIZATION_MEMBERS, target));
  /** How a member that the lists do not name shows. */
  const missing = $derived<MissingUser>(canListOrganizationMembers ? 'deleted' : 'unknown');

  const projectMembersQuery = createQuery(() =>
    projectQueries.members(projectId() ?? null, {
      enabled: can(Permission.LIST_PROJECT_MEMBERS, target),
    }),
  );
  const organizationMembersQuery = createQuery(() =>
    organizationQueries.members(organizationId, { enabled: canListOrganizationMembers }),
  );
  const organizationGrantsQuery = createQuery(() =>
    roleQueries.scopedGrants(PermissionScope.ORGANIZATION, organizationId, {
      enabled: canReadOrganizationGrants,
    }),
  );

  const projectMembers = $derived(projectMembersQuery.data ?? []);
  const organizationMembers = $derived(organizationMembersQuery.data ?? []);
  const organizationGrants = $derived(organizationGrantsQuery.data ?? []);

  const roles = createAssignableRoles(PermissionScope.PROJECT, () => organizationId);

  const membership = createScopeMembership({
    scope: PermissionScope.PROJECT,
    scopeId: () => projectId() ?? null,
    canManage: () => canManage,
    // The backend derives members from grants; the grant mutations cannot reach this key.
    onMembershipChanged: () => void invalidateProjectMembers(projectId() ?? null),
  });

  let addOpen = $state(false);
  let pendingRemoval = $state<PendingRemoval | null>(null);

  const userById = $derived.by(() => {
    // Rebuilt whole by the `$derived` and never mutated after it is read, so a
    // reactive collection would only make a throwaway object track dependencies.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const users = new Map<string, UserSummary>();
    for (const member of organizationMembers) users.set(member.id, member);
    for (const member of projectMembers) users.set(member.id, member);
    return users;
  });

  const userFor = (memberId: string) => userById.get(memberId);

  /** An organization role reaches the project when it confers reading one. `organization-member` does not. */
  const reachesProjects = $derived((roleId: string) =>
    roleConfers(roles.roleById.get(roleId), Permission.READ_PROJECT),
  );

  const members = $derived(
    buildProjectMembers(
      membership.grants,
      organizationGrants,
      reachesProjects,
      projectMembers.map(member => member.id),
    ),
  );

  // Rebuilt whole by the `$derived` and never mutated after it is read.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const memberIds = $derived(new Set(members.map(member => member.userId)));

  const candidates = $derived(organizationMembers.filter(member => !memberIds.has(member.id)));

  const zoneContext = $derived<ProjectMembersContext>({
    organizationId: organizationId ?? '',
    projectId: projectId() ?? '',
    canManage,
    memberCount: members.length,
    refreshMembers: membership.refresh,
  });

  const currentUserId = localStorage.getItem('userId') ?? '';

  /** The project's own roles: the editable ones. */
  const directRoleIds = (member: ScopeMember): Set<string> =>
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- a lookup table local to this call, never state
    new Set(
      member.roles.filter(role => role.origin === MemberRoleOrigin.DIRECT).map(role => role.roleId),
    );

  /** Only project roles count as held: an inherited role can still be granted here. */
  const addableRolesFor = (member: ScopeMember) => {
    const held = directRoleIds(member);
    return roles.assignableRoles.filter(role => !held.has(role.roleId));
  };

  const canRemove = (member: ScopeMember) => canManage && directRoleIds(member).size > 0;

  const requestRemoval = (member: ScopeMember) => {
    pendingRemoval = { userId: member.userId, name: userName(userFor(member.userId), missing) };
  };

  const addMember = async (userId: string, roleIds: string[]) => {
    const granted = await membership.grantRoles(userId, roleIds);
    if (granted) toast.success(i18n._(membershipMessages.memberAdded(roleIds.length)));
    return granted;
  };

  const removeMember = async () => {
    if (!pendingRemoval) return;
    await membership.removeMember(pendingRemoval.userId, pendingRemoval.name);
    pendingRemoval = null;
  };

  return {
    get organizationName() {
      return context().organization.name ?? '';
    },
    get canManage() {
      return canManage;
    },
    get canReadOrganizationGrants() {
      return canReadOrganizationGrants;
    },
    get canListOrganizationMembers() {
      return canListOrganizationMembers;
    },
    get missing() {
      return missing;
    },
    get members() {
      return members;
    },
    get candidates() {
      return candidates;
    },
    get isLoading() {
      return (
        projectMembersQuery.isLoading ||
        organizationMembersQuery.isLoading ||
        organizationGrantsQuery.isLoading ||
        membership.isLoading
      );
    },
    get isPending() {
      return membership.isPending;
    },
    get isRemoving() {
      return membership.isRemoving;
    },
    get roles() {
      return roles;
    },
    get zoneContext() {
      return zoneContext;
    },
    get addOpen() {
      return addOpen;
    },
    set addOpen(value: boolean) {
      addOpen = value;
    },
    get pendingRemoval() {
      return pendingRemoval;
    },
    currentUserId,
    userFor,
    addableRolesFor,
    canRemove,
    requestRemoval,
    cancelRemoval: () => {
      pendingRemoval = null;
    },
    revokeRole: membership.revokeRole,
    addRole: membership.addRole,
    addMember,
    removeMember,
  };
};

export type ProjectMembersPage = ReturnType<typeof createProjectMembersPage>;
