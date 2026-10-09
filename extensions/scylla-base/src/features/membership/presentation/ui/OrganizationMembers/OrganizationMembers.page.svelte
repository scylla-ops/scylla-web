<script lang="ts">
  import { i18n } from '@lingui/core';
  import { can, Permission, PermissionScope } from '@platform/authz';
  import { contextStore } from '@platform/context';
  import { createQuery } from '@scylla/core-sdk';
  import { invalidateOrganizationMembers, organizationQueries } from '@base/features/organization';
  import { userQueries, type UserSummary } from '@base/features/user';
  import { userName } from '@shared/presentation/ui';
  import { ConfirmOperationAlertDialog, FeatureHeader } from '@scylla/ui';
  import { toRune } from '@scylla/ui/stores';
  import { toast } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import { buildOrganizationMembers } from '../../../domain/structs/scope-member.struct.ts';
  import { createAssignableRoles } from '../../assignable-roles.state.svelte.ts';
  import { createScopeMembership } from '../../scope-membership.state.svelte.ts';
  import AddMemberDialog from '../components/AddMemberDialog/AddMemberDialog.svelte';
  import MembersList from '../components/MembersList/MembersList.svelte';
  import { membershipMessages } from '../membership.messages.ts';

  /** The builtin that only means "belongs here". */
  const ORGANIZATION_MEMBER_ROLE_ID = 'organization-member';

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

  const roles = createAssignableRoles(PermissionScope.ORGANIZATION, () => organizationId);

  const membership = createScopeMembership({
    scope: PermissionScope.ORGANIZATION,
    scopeId: () => organizationId,
    canManage: () => canManage,
    // The backend derives members from grants; the grant mutations cannot reach this key.
    onMembershipChanged: () => void invalidateOrganizationMembers(organizationId),
  });

  let addOpen = $state(false);
  let pendingRemoval = $state<{ userId: string; name: string } | null>(null);

  /** The members, with the display name and the email of the directory when it is readable. */
  const userById = $derived.by(() => {
    // Rebuilt whole by the `$derived` and never mutated after it is read.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const users = new Map<string, UserSummary>(members.map(member => [member.userId, member]));
    for (const user of usersQuery.data?.items ?? []) {
      if (users.has(user.userId)) users.set(user.userId, user);
    }
    return users;
  });

  const userFor = (memberId: string) => userById.get(memberId);

  /** Seeded with the backend's list: someone reached only through a project is listed too. */
  const scopeMembers = $derived(buildOrganizationMembers(membership.grants, [...userById.keys()]));

  const candidates = $derived(
    (usersQuery.data?.items ?? []).filter(user => !userById.has(user.userId)),
  );

  const defaultRoleId = $derived(
    roles.assignableRoles.find(role => role.roleId === ORGANIZATION_MEMBER_ROLE_ID)?.roleId,
  );

  const currentUserId = localStorage.getItem('userId') ?? '';

  const handleAdd = async (userId: string, roleIds: string[]) => {
    const granted = await membership.grantRoles(userId, roleIds);
    if (granted) toast.success(i18n._(membershipMessages.memberAdded(roleIds.length)));
    return granted;
  };

  const handleRemove = async () => {
    if (!pendingRemoval) return;
    await membership.removeMember(pendingRemoval.userId, pendingRemoval.name);
    pendingRemoval = null;
  };
</script>

<!-- Writes need `MANAGE_ORG_GRANTS` on this organization. -->
{#snippet blurb()}
  <p class="max-w-3xl text-sm text-muted-foreground">
    {t(membershipMessages.organizationBlurb(organization.name ?? ''))}
  </p>
{/snippet}

{#if !organizationId}
  <div class="flex h-full items-center justify-center">
    <p class="text-sm text-muted-foreground">{t(membershipMessages.selectAnOrganization)}</p>
  </div>
{:else}
  <div class="flex h-full min-h-0 w-full flex-col gap-4">
    <FeatureHeader
      count={scopeMembers.length}
      label={t(membershipMessages.member)}
      pluralLabel={t(membershipMessages.members)}
      underLabel={blurb}
      onNew={() => (addOpen = true)}
      newLabel={t(membershipMessages.addAMember)}
      canNew={canManage}
      newDeniedReason={t(membershipMessages.organizationNewDenied)}
    />

    <MembersList
      members={scopeMembers}
      isLoading={membersQuery.isLoading || membership.isLoading}
      emptyMessage={t(membershipMessages.organizationEmpty)}
      {userFor}
      organizationName={organization.name ?? ''}
      labelFor={roles.labelFor}
      {currentUserId}
      {canManage}
      disabled={membership.isPending}
      onRevokeRole={role => void membership.revokeRole(role)}
      addableRolesFor={member =>
        roles.assignableRoles.filter(
          role => !member.roles.some(held => held.roleId === role.roleId),
        )}
      onAddRole={(memberId, roleId) => void membership.addRole(memberId, roleId)}
      emptyRoles={canManage
        ? t(membershipMessages.reachedViaProject)
        : t(membershipMessages.managedByOrgAdmin)}
      canRemove={() => canManage}
      removeTooltip={t(membershipMessages.removeFromOrganization)}
      onRemove={member =>
        (pendingRemoval = { userId: member.userId, name: userName(userFor(member.userId)) })}
    />

    <AddMemberDialog
      open={addOpen}
      onOpenChange={open => (addOpen = open)}
      title={t(membershipMessages.addToOrganization(organization.name ?? ''))}
      description={t(membershipMessages.addToOrganizationBody)}
      {candidates}
      emptyCandidatesLabel={canListUsers
        ? t(membershipMessages.everyoneIsMember)
        : t(membershipMessages.cannotBrowseDirectory)}
      roles={roles.assignableRoles}
      organizationName={organization.name ?? ''}
      rolesLabel={t(membershipMessages.rolesToGrant)}
      rolesLoading={roles.isLoading}
      isPending={membership.isPending}
      {defaultRoleId}
      onSubmit={handleAdd}
    />

    <ConfirmOperationAlertDialog
      open={pendingRemoval !== null}
      onOpenChange={open => {
        if (!open) pendingRemoval = null;
      }}
      isLoading={membership.isRemoving}
      title={t(
        membershipMessages.confirmRemoveFromOrganization(
          pendingRemoval?.name ?? '',
          organization.name ?? '',
        ),
      )}
      description={t(membershipMessages.confirmRemoveFromOrganizationBody)}
      onContinue={() => void handleRemove()}
    />
  </div>
{/if}
