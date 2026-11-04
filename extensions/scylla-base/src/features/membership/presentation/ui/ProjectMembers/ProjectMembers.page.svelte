<script lang="ts">
  import { i18n } from '@lingui/core';
  import { can, Permission, PermissionScope } from '@platform/authz';
  import { contextStore } from '@platform/context';
  import { createQuery, WidgetZone } from '@scylla/core-sdk';
  import { accessQueries, workspaceRef, type AccessEntryEntity } from '@base/features/access';
  import { invalidateProjectMembers } from '@base/features/project';
  import type { UserSummary } from '@base/features/user';
  import { userName } from '@shared/presentation/ui';
  import { ConfirmOperationAlertDialog, FeatureHeader, GatedButton } from '@scylla/ui';
  import { toRune } from '@scylla/ui/stores';
  import { toast } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import {
    buildProjectMembers,
    MemberRoleOrigin,
    type ScopeMember,
  } from '@base/features/membership/presentation/presenters/scope-members.presenter.ts';
  import {
    createAssignableRoles,
  } from '@base/features/membership/presentation/ui/components/assignable-roles.state.svelte.ts';
  import {
    createScopeMembership,
  } from '@base/features/membership/presentation/ui/scope-membership.state.svelte.ts';
  import {
    membershipPoints,
    type ProjectMembersContext,
  } from '@base/features/membership/presentation/membership.points.ts';
  import AddMemberDialog from '../components/AddMemberDialog/AddMemberDialog.svelte';
  import MembersHint from '../components/MembersHint/MembersHint.svelte';
  import MembersList from '../components/MembersList/MembersList.svelte';
  import { membershipMessages } from '@base/features/membership/presentation/messages/membership.messages.ts';

  interface Props {
    projectId?: string;
  }

  let { projectId }: Props = $props();

  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id);
  // About this project, not the context's: a direct URL can land here before the two agree.
  const target = $derived({
    projectId: projectId ?? undefined,
    workspaceId: workspaceId ?? undefined,
  });

  const canManage = $derived(can(Permission.MANAGE_PROJECT_GRANTS, target));
  const canListWorkspaceMembers = $derived(
    can(Permission.LIST_WORKSPACE_MEMBERS, target),
  );

  // The roles of the workspace reach its projects: they show here, locked.
  const workspaceAccessQuery = createQuery(() =>
    accessQueries.list(workspaceId ? workspaceRef(workspaceId) : null, {
      enabled: canListWorkspaceMembers,
    }),
  );
  const workspaceEntries = $derived(workspaceAccessQuery.data ?? []);

  const roles = createAssignableRoles(PermissionScope.PROJECT);

  const membership = createScopeMembership({
    scope: PermissionScope.PROJECT,
    scopeId: () => projectId ?? null,
    canRead: () => can(Permission.LIST_PROJECT_MEMBERS, target),
    // The member list of the project feature reads the same roles.
    onMembershipChanged: () => void invalidateProjectMembers(projectId ?? null),
  });

  const summaryOf = (entry: AccessEntryEntity): UserSummary => ({
    id: entry.actorId,
    username: entry.handle,
    ...(entry.displayName ? { displayName: entry.displayName } : {}),
  });

  let addOpen = $state(false);
  let pendingRemoval = $state<{ userId: string; name: string } | null>(null);

  const userById = $derived.by(() => {
    // Rebuilt whole by the `$derived` and never mutated after it is read, so a
    // reactive collection would only make a throwaway object track dependencies.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const users = new Map<string, UserSummary>();
    for (const entry of workspaceEntries) users.set(entry.actorId, summaryOf(entry));
    for (const entry of membership.entries) users.set(entry.actorId, summaryOf(entry));
    return users;
  });

  const userFor = (memberId: string) => userById.get(memberId);

  const members = $derived(buildProjectMembers(membership.entries, workspaceEntries));

  /** A person of the workspace with no role of the project's own can get one. */
  const directMemberIds = $derived(
    new Set(
      members
        .filter(member => member.roles.some(role => role.origin === MemberRoleOrigin.DIRECT))
        .map(member => member.userId),
    ),
  );

  const candidates = $derived(
    [...userById.values()].filter(user => !directMemberIds.has(user.id)),
  );

  const zoneContext: ProjectMembersContext = $derived({
    workspaceId: workspaceId ?? '',
    projectId: projectId ?? '',
    canManage,
    memberCount: members.length,
    refreshMembers: membership.refresh,
  });

  const currentUserId = localStorage.getItem('userId') ?? '';

  /** The project's own roles: the editable ones. */
  const directRoleIds = (member: ScopeMember): Set<string> =>
    new Set(
      member.roles
        .filter(role => role.origin === MemberRoleOrigin.DIRECT)
        .map(role => role.roleId),
    );

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

<!--
  The project's own members plus the workspace roles that reach it, each badged
  with its scope. Inherited roles are locked: revoking them changes every project.
  Candidates are the workspace's members (a project grant needs one).
-->
{#snippet actions()}
  <WidgetZone point={membershipPoints.projectActions} context={zoneContext}>
    <GatedButton
      allowed={canManage}
      deniedReason={t(membershipMessages.projectNewDenied)}
      onclick={() => (addOpen = true)}
    >
      {t(membershipMessages.addAMember)}
    </GatedButton>
  </WidgetZone>
{/snippet}

{#snippet blurb()}
  <p class="max-w-3xl text-sm text-muted-foreground">{t(membershipMessages.projectBlurb)}</p>
{/snippet}

{#if projectId}
  <div class="flex h-full min-h-0 w-full flex-col gap-4">
    <FeatureHeader
      count={(workspaceAccessQuery.isLoading || membership.isLoading) ? undefined : members.length}
      label={t(membershipMessages.member)}
      pluralLabel={t(membershipMessages.members)}
      underLabel={blurb}
      extraActions={actions}
    />

    <MembersList
      {members}
      isLoading={workspaceAccessQuery.isLoading ||
        membership.isLoading}
      emptyMessage={t(membershipMessages.projectEmpty)}
      {userFor}
      missing={canListWorkspaceMembers ? 'deleted' : 'unknown'}
      workspaceName={context().workspace.name ?? ''}
      labelFor={roles.labelFor}
      {currentUserId}
      {canManage}
      disabled={membership.isPending}
      onRevokeRole={role => void membership.revokeRole(role)}
      addableRolesFor={member => {
        // Only project roles count as held: an inherited role can still be granted here.
        const held = directRoleIds(member);
        return roles.assignableRoles.filter(role => !held.has(role.roleId));
      }}
      onAddRole={(memberId, roleId) => void membership.addRole(memberId, roleId)}
      emptyRoles={t(membershipMessages.managedByProjectAdmin)}
      canRemove={member => canManage && directRoleIds(member).size > 0}
      removeTooltip={t(membershipMessages.removeFromProject)}
      onRemove={member =>
        (pendingRemoval = {
          userId: member.userId,
          name: userName(userFor(member.userId), canListWorkspaceMembers ? 'deleted' : 'unknown'),
        })}
    />

    <MembersHint>
      {canListWorkspaceMembers
        ? t(membershipMessages.inheritedHintVisible)
        : t(membershipMessages.inheritedHintHidden)}
    </MembersHint>

    <WidgetZone point={membershipPoints.projectSection} context={zoneContext} />

    <AddMemberDialog
      open={addOpen}
      onOpenChange={open => (addOpen = open)}
      title={t(membershipMessages.addToProject)}
      description={t(membershipMessages.addToProjectBody)}
      {candidates}
      emptyCandidatesLabel={canListWorkspaceMembers
        ? t(membershipMessages.everyWorkspaceMemberHere)
        : t(membershipMessages.cannotBrowseWorkspaceMembers)}
      roles={roles.assignableRoles}
      workspaceName={context().workspace.name ?? ''}
      rolesLabel={t(membershipMessages.projectRolesToGrant)}
      rolesLoading={roles.isLoading}
      isPending={membership.isPending}
      onSubmit={handleAdd}
    />

    <ConfirmOperationAlertDialog
      open={pendingRemoval !== null}
      onOpenChange={open => {
        if (!open) pendingRemoval = null;
      }}
      isLoading={membership.isRemoving}
      title={t(membershipMessages.confirmRemoveFromProject(pendingRemoval?.name ?? ''))}
      description={t(membershipMessages.confirmRemoveFromProjectBody)}
      onContinue={() => void handleRemove()}
    />
  </div>
{/if}
