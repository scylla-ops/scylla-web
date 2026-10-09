<script lang="ts">
  import { Button } from '@scylla/ui/shadcn';
  import { ConfirmOperationAlertDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import type { UserEntity } from '../../../domain/entities/user.entity.ts';
  import type { UserDetail } from '../../user-detail.state.svelte.ts';
  import SessionList from '../components/SessionList.svelte';
  import SettingsSection from '../components/SettingsSection.svelte';
  import UserAccessList from '../components/UserAccessList/UserAccessList.svelte';
  import UserProfileForm from '../components/UserProfileForm/UserProfileForm.svelte';
  import UserDetailHeader from './UserDetailHeader.svelte';
  import UserSecurity from './UserSecurity.svelte';
  import { userMessages } from '../user.messages.ts';

  let { page, user }: { page: UserDetail; user: UserEntity } = $props();
</script>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-8">
  <UserDetailHeader {user} />

  <SettingsSection title={t(userMessages.profile)} description={t(userMessages.profileDescription)}>
    <UserProfileForm
      {user}
      emailEditable={page.canEditEmail}
      canEdit={page.canUpdate}
      isPending={page.isSavingProfile}
      onSave={page.saveProfile}
    />
  </SettingsSection>

  <SettingsSection title={t(userMessages.organizationsAndRoles)}>
    <UserAccessList access={page.access} isLoading={page.accessLoading} isError={page.accessError} />
  </SettingsSection>

  <SettingsSection
    title={t(userMessages.sessions)}
    description={t(userMessages.userSessionsDescription)}
  >
    <div class="flex flex-col gap-4">
      <SessionList
        sessions={page.sessions}
        isLoading={page.sessionsLoading}
        isError={page.sessionsError}
        canRevoke={page.canUpdate}
        isRevoking={page.isRevokingSession}
        onRevoke={page.revokeSession}
      />
      {#if page.canUpdate}
        <div>
          <Button
            variant="outline"
            disabled={page.isRevokingSessions}
            onclick={page.signOutEverywhere}
          >
            {t(userMessages.signOutEverywhere)}
          </Button>
        </div>
      {/if}
    </div>
  </SettingsSection>

  {#if page.canUpdate}
    <SettingsSection
      title={t(userMessages.security)}
      description={t(userMessages.securityDescription)}
    >
      <UserSecurity {page} />
    </SettingsSection>
  {/if}

  {#if page.canDelete}
    <SettingsSection
      title={t(userMessages.dangerZone)}
      description={t(userMessages.deleteUserBody)}
      tone="danger"
    >
      <Button variant="destructive" onclick={() => page.askDelete()}>
        {t(userMessages.deleteUser)}
      </Button>
    </SettingsSection>
  {/if}

  <ConfirmOperationAlertDialog
    open={page.confirmStatusChange}
    onOpenChange={page.askStatusChange}
    isLoading={page.isChangingStatus}
    title={user.isActive ? t(userMessages.deactivateTitle) : t(userMessages.reactivateTitle)}
    description={user.isActive ? t(userMessages.deactivateBody) : t(userMessages.reactivateBody)}
    continueLabel={user.isActive
      ? t(userMessages.deactivateConfirm)
      : t(userMessages.reactivateConfirm)}
    onContinue={page.changeStatus}
  />

  <ConfirmOperationAlertDialog
    open={page.confirmDelete}
    onOpenChange={page.askDelete}
    isLoading={page.isRemoving}
    title={t(userMessages.deleteUserTitle)}
    description={t(userMessages.deleteUserBody)}
    continueLabel={t(userMessages.deleteUser)}
    onContinue={page.remove}
  />
</div>
