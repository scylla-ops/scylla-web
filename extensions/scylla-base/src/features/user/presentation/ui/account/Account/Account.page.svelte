<script lang="ts">
  import { Button, Skeleton } from '@scylla/ui/shadcn';
  import { ErrorState } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { UserIdentity } from '@shared/presentation/ui';
  import { createAccountPage } from '../../../account-page.state.svelte.ts';
  import SettingsSection from '../../components/SettingsSection.svelte';
  import UserAccessList from '../../components/UserAccessList/UserAccessList.svelte';
  import UserProfileForm from '../../components/UserProfileForm/UserProfileForm.svelte';
  import ChangePasswordForm from '../ChangePasswordForm.svelte';
  import DeleteAccountDialog from '../DeleteAccountDialog/DeleteAccountDialog.svelte';
  import { userMessages } from '../../user.messages.ts';

  const page = createAccountPage();
</script>

{#if page.isLoading}
  <Skeleton class="m-4 h-64 rounded-xl" />
{:else if page.isError || !page.me}
  <ErrorState message={t(userMessages.accountLoadError)} />
{:else}
  {@const me = page.me}
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-8">
    <header class="flex flex-col gap-3">
      <h1 class="text-2xl font-semibold">{t(userMessages.account)}</h1>
      <UserIdentity user={me} />
    </header>

    <SettingsSection title={t(userMessages.profile)} description={t(userMessages.profileDescription)}>
      <UserProfileForm
        user={me}
        emailEditable={false}
        isPending={page.isSavingProfile}
        onSave={page.saveProfile}
      />
    </SettingsSection>

    <SettingsSection title={t(userMessages.password)} description={t(userMessages.passwordDescription)}>
      {#key page.passwordForm}
        <ChangePasswordForm
          isPending={page.isChangingPassword}
          refusal={page.passwordRefusal}
          onSubmit={page.changePassword}
        />
      {/key}
    </SettingsSection>

    <SettingsSection title={t(userMessages.sessions)} description={t(userMessages.sessionsDescription)}>
      <Button
        variant="outline"
        disabled={page.isRevokingSessions}
        onclick={page.signOutOtherSessions}
      >
        {t(userMessages.signOutOthers)}
      </Button>
    </SettingsSection>

    <SettingsSection title={t(userMessages.organizationsAndRoles)}>
      <UserAccessList
        access={page.access}
        isLoading={page.accessLoading}
        isError={page.accessError}
      />
    </SettingsSection>

    <SettingsSection
      title={t(userMessages.dangerZone)}
      description={t(userMessages.deleteMyAccountDescription)}
      tone="danger"
    >
      <Button variant="destructive" onclick={page.openDelete}>
        {t(userMessages.deleteMyAccount)}
      </Button>
    </SettingsSection>

    <DeleteAccountDialog
      open={page.deleteOpen}
      onOpenChange={open => (open ? page.openDelete() : page.closeDelete())}
      isPending={page.isDeletingAccount}
      refusal={page.deleteRefusal}
      onConfirm={page.deleteAccount}
    />
  </div>
{/if}
