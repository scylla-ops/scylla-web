import { can, Permission, PermissionScope } from '@platform/authz';
import { contextStore } from '@platform/context';
import { createQuery } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import { t } from '@scylla/ui/i18n';
import { invalidateOrganizationMembers, organizationQueries } from '@base/features/organization';
import { userQueries, type UserSummary } from '@base/features/user';
import { userName } from '@shared/presentation/ui';
import {
  buildOrganizationMembers,
  type ScopeMember,
} from '@base/features/membership/presentation/presenters/scope-members.presenter.ts';
import { createAssignableRoles } from '@base/features/membership/presentation/ui/components/assignable-roles.state.svelte.ts';
import { createScopeMembership } from '@base/features/membership/presentation/ui/scope-membership.state.svelte.ts';
import {
  membershipPoints,
  type OrganizationMembersContext,
} from '@base/features/membership/presentation/membership.points.ts';
import { membershipMessages } from '@base/features/membership/presentation/messages/membership.messages.ts';

/** The builtin that only means "belongs here". */
const ORGANIZATION_MEMBER_ROLE_ID = 'organization-member';

/**
 * The members page of the current organization: its grants, the directory when the caller may
 * read it, the candidates, and the operations on them.
 */
export const createOrganizationMembersPage = () => {
  const context = toRune(contextStore);
  const organization = $derived(context().organization);
  const organizationId = $derived(organization.id);
  const target = $derived({ organizationId: organizationId ?? undefined });

  const canManage = $derived(can(Permission.MANAGE_ORG_GRANTS, target));
  // Without LIST_USERS, roles can still be changed among the people already here.
  const canListUsers = $derived(can(Permission.LIST_USERS));

  const membersQuery = createQuery(() => organizationQueries.members(organizationId));
  const usersQuery = createQuery(() => userQueries.list({ enabled: canListUsers }));

  const members = $derived(membersQuery.data ?? []);

  /** The members, with the display name and the email of the directory when it is readable. */
  const userById = $derived.by(() => {
    // Rebuilt whole by the `$derived` and never mutated after it is read.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const users = new Map<string, UserSummary>(members.map(member => [member.id, member]));
    for (const user of usersQuery.data?.items ?? []) {
      if (users.has(user.id)) users.set(user.id, user);
    }
    return users;
  });

  const userFor = (memberId: string) => userById.get(memberId);

  const roles = createAssignableRoles(PermissionScope.ORGANIZATION, () => organizationId);

  const membership = createScopeMembership({
    scope: PermissionScope.ORGANIZATION,
    scopeId: () => organizationId,
    canManage: () => canManage,
    nameOf: userId => userName(userFor(userId)),
    // The backend derives members from grants; the grant mutations cannot reach this key.
    onMembershipChanged: () => void invalidateOrganizationMembers(organizationId),
  });

  const addAction = membershipPoints.organizationAddMember.resolve({
    withoutDirectory: 'deny',
    variant: 'default',
  });
  const showAdd = $derived(canListUsers || addAction.withoutDirectory === 'deny');
  const addDeniedReason = $derived(
    canManage
      ? t(membershipMessages.onlySystemAdminCanBrowseUsers)
      : t(membershipMessages.organizationNewDenied),
  );

  /** Seeded with the backend's list: someone reached only through a project is listed too. */
  const scopeMembers = $derived(buildOrganizationMembers(membership.grants, [...userById.keys()]));

  const candidates = $derived(
    (usersQuery.data?.items ?? []).filter(user => !userById.has(user.id)),
  );

  const defaultRoleId = $derived(
    roles.assignableRoles.find(role => role.roleId === ORGANIZATION_MEMBER_ROLE_ID)?.roleId,
  );

  const zoneContext = $derived<OrganizationMembersContext>({
    organizationId: organizationId ?? '',
    organizationName: organization.name ?? '',
    canManage,
    memberCount: scopeMembers.length,
    refreshMembers: membership.refresh,
  });

  const currentUserId = localStorage.getItem('userId') ?? '';

  const addableRolesFor = (member: ScopeMember) =>
    roles.assignableRoles.filter(role => !member.roles.some(held => held.roleId === role.roleId));

  return {
    get organizationId() {
      return organizationId;
    },
    get organizationName() {
      return organization.name ?? '';
    },
    get canManage() {
      return canManage;
    },
    get canListUsers() {
      return canListUsers;
    },
    get showAdd() {
      return showAdd;
    },
    get addVariant() {
      return addAction.variant;
    },
    get addDeniedReason() {
      return addDeniedReason;
    },
    get members() {
      return scopeMembers;
    },
    get candidates() {
      return candidates;
    },
    get defaultRoleId() {
      return defaultRoleId;
    },
    get isLoading() {
      return membersQuery.isLoading || membership.isLoading;
    },
    get roles() {
      return roles;
    },
    get membership() {
      return membership;
    },
    get zoneContext() {
      return zoneContext;
    },
    currentUserId,
    userFor,
    addableRolesFor,
  };
};
