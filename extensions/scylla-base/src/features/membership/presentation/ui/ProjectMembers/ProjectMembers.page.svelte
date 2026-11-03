<script lang="ts">
  import { WidgetZone } from '@scylla/core-sdk';
  import { ConfirmOperationAlertDialog, FeatureHeader, GatedButton } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { membershipPoints } from '@base/features/membership/presentation/membership.points.ts';
  import { membershipMessages } from '@base/features/membership/presentation/messages/membership.messages.ts';
  import AddMemberDialog from '../components/AddMemberDialog/AddMemberDialog.svelte';
  import MembersHint from '../components/MembersHint/MembersHint.svelte';
  import MembersList from '../components/MembersList/MembersList.svelte';
  import { createProjectMembersPage } from './project-members-page.state.svelte.ts';

  interface Props {
    projectId?: string;
  }

  let { projectId }: Props = $props();

  const page = createProjectMembersPage(() => projectId);
</script>

<!--
  The project's own members plus the organization roles that reach it, each badged
  with its scope. Inherited roles are locked: revoking them changes every project.
  Candidates are the organization's members (a project grant needs one).
-->
{#snippet actions()}
  <WidgetZone point={membershipPoints.projectActions} context={page.zoneContext}>
    <GatedButton
      allowed={page.canManage}
      deniedReason={t(membershipMessages.projectNewDenied)}
      onclick={() => (page.membership.addOpen = true)}
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
      count={page.members.length}
      label={t(membershipMessages.member)}
      pluralLabel={t(membershipMessages.members)}
      underLabel={blurb}
      extraActions={actions}
    />

    <MembersList
      members={page.members}
      isLoading={page.isLoading}
      emptyMessage={t(membershipMessages.projectEmpty)}
      userFor={page.userFor}
      missing={page.missing}
      organizationName={page.organizationName}
      labelFor={page.roles.labelFor}
      currentUserId={page.currentUserId}
      canManage={page.canManage}
      disabled={page.membership.isPending}
      onRevokeRole={role => void page.membership.revokeRole(role)}
      addableRolesFor={page.addableRolesFor}
      onAddRole={(memberId, roleId) => void page.membership.addRole(memberId, roleId)}
      emptyRoles={t(membershipMessages.managedByProjectAdmin)}
      canRemove={page.canRemove}
      removeTooltip={t(membershipMessages.removeFromProject)}
      onRemove={page.membership.requestRemoval}
    />

    <MembersHint>
      {page.canReadOrganizationGrants
        ? t(membershipMessages.inheritedHintVisible)
        : t(membershipMessages.inheritedHintHidden)}
    </MembersHint>

    <WidgetZone point={membershipPoints.projectSection} context={page.zoneContext} />

    <AddMemberDialog
      open={page.membership.addOpen}
      onOpenChange={open => (page.membership.addOpen = open)}
      title={t(membershipMessages.addToProject)}
      description={t(membershipMessages.addToProjectBody)}
      candidates={page.candidates}
      emptyCandidatesLabel={page.canListOrganizationMembers
        ? t(membershipMessages.everyOrgMemberHere)
        : t(membershipMessages.cannotBrowseOrgMembers)}
      roles={page.roles.assignableRoles}
      organizationName={page.organizationName}
      rolesLabel={t(membershipMessages.projectRolesToGrant)}
      rolesLoading={page.roles.isLoading}
      isPending={page.membership.isPending}
      onSubmit={page.membership.addMember}
    />

    <ConfirmOperationAlertDialog
      open={page.membership.pendingRemoval !== null}
      onOpenChange={open => {
        if (!open) page.membership.cancelRemoval();
      }}
      isLoading={page.membership.isRemoving}
      title={t(
        membershipMessages.confirmRemoveFromProject(page.membership.pendingRemoval?.name ?? ''),
      )}
      description={t(membershipMessages.confirmRemoveFromProjectBody)}
      onContinue={() => void page.membership.confirmRemoval()}
    />
  </div>
{/if}
