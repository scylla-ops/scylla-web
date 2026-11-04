<script lang="ts">
  import { i18n } from '@lingui/core';
  import { can, Permission, PermissionScope } from '@platform/authz';
  import type { AccessEntryEntity } from '@base/features/access';
  import { contextStore } from '@platform/context';
  import { createQuery, WidgetZone } from '@scylla/core-sdk';
  import { invalidateOrganizationMembers } from '@base/features/organization';
  import { userQueries, type UserSummary } from '@base/features/user';
  import { userName } from '@shared/presentation/ui';
  import { ConfirmOperationAlertDialog, FeatureHeader, GatedButton } from '@scylla/ui';
  import { toRune } from '@scylla/ui/stores';
  import { toast } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import {
    buildOrganizationMembers,
  } from '@base/features/membership/presentation/presenters/scope-members.presenter.ts';
  import {
    createAssignableRoles,
  } from '@base/features/membership/presentation/ui/components/assignable-roles.state.svelte.ts';
  import {
    createScopeMembership,
  } from '@base/features/membership/presentation/ui/scope-membership.state.svelte.ts';
  import {
    membershipPoints,
    type OrganizationMembersContext,
  } from '@base/features/membership/presentation/membership.points.ts';
  import { loadInviteDialog, loadPendingInvitations } from '@base/features/invitation';
  import AddMemberDialog from '../components/AddMemberDialog/AddMemberDialog.svelte';
  import OwnersCard from '../components/OwnersCard/OwnersCard.svelte';
  import MembersList from '../components/MembersList/MembersList.svelte';
  import { membershipMessages } from '@base/features/membership/presentation/messages/membership.messages.ts';

  /** The role that only means "works here". */
  const DEFAULT_ROLE_ID = 'member';

  const context = toRune(contextStore);
  const organization = $derived(context().organization);
  const organizationId = $derived(organization.id);
  const target = $derived({ organizationId: organizationId ?? undefined });

  const canManage = $derived(can(Permission.MANAGE_ORG_GRANTS, target));
  const canRead = $derived(can(Permission.LIST_ORGANIZATION_MEMBERS, target));
  // Without LIST_USERS, roles can still be changed among the people already here.
  const canListUsers = $derived(can(Permission.LIST_USERS));

  const usersQuery = createQuery(() => userQueries.list({ enabled: canListUsers }));

  const roles = createAssignableRoles(PermissionScope.ORGANIZATION);

  const membership = createScopeMembership({
    scope: PermissionScope.ORGANIZATION,
    scopeId: () => organizationId,
    canRead: () => canRead,
    // The member list of the workspace feature reads the same roles.
    onMembershipChanged: () => void invalidateOrganizationMembers(organizationId),
  });

  const summaryOf = (entry: AccessEntryEntity): UserSummary => ({
    id: entry.actorId,
    username: entry.handle,
    ...(entry.displayName ? { displayName: entry.displayName } : {}),
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

  let addOpen = $state(false);
  let inviteOpen = $state(false);
  /** `create_invitation` and `list_invitations` need the same right as a grant: admin. */
  const canInvite = $derived(can(Permission.ADD_ORGANIZATION_MEMBER, target));
  let pendingRemoval = $state<{ userId: string; name: string } | null>(null);

  /** The members, with the display name and the email of the directory when it is readable. */
  const userById = $derived.by(() => {
    // Rebuilt whole by the `$derived` and never mutated after it is read.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const users = new Map<string, UserSummary>(
      membership.entries.map(entry => [entry.actorId, summaryOf(entry)]),
    );
    for (const user of usersQuery.data?.items ?? []) {
      if (users.has(user.id)) users.set(user.id, user);
    }
    return users;
  });

  const userFor = (memberId: string) => userById.get(memberId);

  const scopeMembers = $derived(buildOrganizationMembers(membership.entries));

  const candidates = $derived(
    (usersQuery.data?.items ?? []).filter(user => !userById.has(user.id)),
  );

  const defaultRoleId = $derived(
    roles.assignableRoles.find(role => role.roleId === DEFAULT_ROLE_ID)?.roleId,
  );

  const zoneContext: OrganizationMembersContext = $derived({
    organizationId: organizationId ?? '',
    organizationName: organization.name ?? '',
    canManage,
    memberCount: scopeMembers.length,
    refreshMembers: membership.refresh,
  });

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
{#snippet actions()}
  <WidgetZone point={membershipPoints.organizationActions} context={zoneContext}>
    {#if showAdd}
      <GatedButton
        allowed={canManage && canListUsers}
        deniedReason={addDeniedReason}
        variant={addAction.variant}
        onclick={() => (addOpen = true)}
      >
        {t(membershipMessages.addAMember)}
      </GatedButton>
    {/if}
    {#if canInvite}
      <GatedButton allowed={canInvite} variant="outline" onclick={() => (inviteOpen = true)}>
        {t(membershipMessages.inviteByEmail)}
      </GatedButton>
    {/if}
  </WidgetZone>
{/snippet}

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
      extraActions={actions}
    />

    <MembersList
      members={scopeMembers}
      isLoading={membership.isLoading}
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

    {#if organizationId}
      <OwnersCard
        workspaceId={organizationId}
        members={[...userById.values()]}
        canManage={can(Permission.MANAGE_OWNERS, target)}
      />
      {#await loadPendingInvitations() then { default: PendingInvitations }}
        <PendingInvitations workspaceId={organizationId} />
      {/await}
      {#if inviteOpen}
        {#await loadInviteDialog() then { default: InviteDialog }}
          <InviteDialog
            open={inviteOpen}
            setOpen={open => (inviteOpen = open)}
            workspaceId={organizationId}
          />
        {/await}
      {/if}
    {/if}

    <WidgetZone point={membershipPoints.organizationSection} context={zoneContext} />

    <AddMemberDialog
      open={addOpen}
      onOpenChange={open => (addOpen = open)}
      title={t(membershipMessages.addToOrganization(organization.name ?? ''))}
      description={t(membershipMessages.addToOrganizationBody)}
      {candidates}
      emptyCandidatesLabel={t(membershipMessages.everyoneIsMember)}
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
