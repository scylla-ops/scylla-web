<script lang="ts">
  import { WidgetZone } from '@scylla/core-sdk';
  import { ConfirmOperationAlertDialog, FeatureHeader, GatedButton } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { membershipPoints } from '@base/features/membership/presentation/membership.points.ts';
  import { membershipMessages } from '@base/features/membership/presentation/messages/membership.messages.ts';
  import AddMemberDialog from '../components/AddMemberDialog/AddMemberDialog.svelte';
  import MembersList from '../components/MembersList/MembersList.svelte';
  import { createOrganizationMembersPage } from './organization-members-page.state.svelte.ts';

  const page = createOrganizationMembersPage();
</script>

<!-- Writes need `MANAGE_ORG_GRANTS` on this organization. -->
{#snippet actions()}
  <WidgetZone point={membershipPoints.organizationActions} context={page.zoneContext}>
    {#if page.showAdd}
      <GatedButton
        allowed={page.canManage && page.canListUsers}
        deniedReason={page.addDeniedReason}
        variant={page.addVariant}
        onclick={() => (page.membership.addOpen = true)}
      >
        {t(membershipMessages.addAMember)}
      </GatedButton>
    {/if}
  </WidgetZone>
{/snippet}

{#snippet blurb()}
  <p class="max-w-3xl text-sm text-muted-foreground">
    {t(membershipMessages.organizationBlurb(page.organizationName))}
  </p>
{/snippet}

{#if !page.organizationId}
  <div class="flex h-full items-center justify-center">
    <p class="text-sm text-muted-foreground">{t(membershipMessages.selectAnOrganization)}</p>
  </div>
{:else}
  <div class="flex h-full min-h-0 w-full flex-col gap-4">
    <FeatureHeader
      count={page.members.length}
      label={t(membershipMessages.member)}
      pluralLabel={t(membershipMessages.members)}
      underLabel={blurb}
      extraActions={actions}
    />

    <MembersList
      members={page.members}
      isLoading={page.isLoading}
      emptyMessage={t(membershipMessages.organizationEmpty)}
      userFor={page.userFor}
      organizationName={page.organizationName}
      labelFor={page.roles.labelFor}
      currentUserId={page.currentUserId}
      canManage={page.canManage}
      disabled={page.membership.isPending}
      onRevokeRole={role => void page.membership.revokeRole(role)}
      addableRolesFor={page.addableRolesFor}
      onAddRole={(memberId, roleId) => void page.membership.addRole(memberId, roleId)}
      emptyRoles={page.canManage
        ? t(membershipMessages.reachedViaProject)
        : t(membershipMessages.managedByOrgAdmin)}
      canRemove={() => page.canManage}
      removeTooltip={t(membershipMessages.removeFromOrganization)}
      onRemove={page.membership.requestRemoval}
    />

    <WidgetZone point={membershipPoints.organizationSection} context={page.zoneContext} />

    <AddMemberDialog
      open={page.membership.addOpen}
      onOpenChange={open => (page.membership.addOpen = open)}
      title={t(membershipMessages.addToOrganization(page.organizationName))}
      description={t(membershipMessages.addToOrganizationBody)}
      candidates={page.candidates}
      emptyCandidatesLabel={t(membershipMessages.everyoneIsMember)}
      roles={page.roles.assignableRoles}
      organizationName={page.organizationName}
      rolesLabel={t(membershipMessages.rolesToGrant)}
      rolesLoading={page.roles.isLoading}
      isPending={page.membership.isPending}
      defaultRoleId={page.defaultRoleId}
      onSubmit={page.membership.addMember}
    />

    <ConfirmOperationAlertDialog
      open={page.membership.pendingRemoval !== null}
      onOpenChange={open => {
        if (!open) page.membership.cancelRemoval();
      }}
      isLoading={page.membership.isRemoving}
      title={t(
        membershipMessages.confirmRemoveFromOrganization(
          page.membership.pendingRemoval?.name ?? '',
          page.organizationName,
        ),
      )}
      description={t(membershipMessages.confirmRemoveFromOrganizationBody)}
      onContinue={() => void page.membership.confirmRemoval()}
    />
  </div>
{/if}
