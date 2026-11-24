<script lang="ts">
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { AccountPage } from './account-page.state.svelte.ts';
  import ChangePasswordForm from './ChangePasswordForm.svelte';
  import ChangeEmailDialog from '@base/features/user/presentation/ui/components/ChangeEmailDialog/ChangeEmailDialog.svelte';
  import SignInMethods from '@base/features/user/presentation/ui/components/SignInMethods/SignInMethods.svelte';
  import SessionList from '@base/features/user/presentation/ui/components/SessionList.svelte';
  import SettingsSection from '@base/features/user/presentation/ui/components/SettingsSection.svelte';
  import { userMessages } from '@base/features/user/presentation/messages/user.messages.ts';

  let { page }: { page: AccountPage } = $props();

  let emailOpen = $state(false);
</script>

<SettingsSection title={t(userMessages.email)} description={t(userMessages.emailDescription)}>
  {#snippet action()}
    <Button variant="outline" size="sm" onclick={() => (emailOpen = true)}>
      {t(userMessages.changeEmail)}
    </Button>
  {/snippet}
  <p class="text-sm">{page.me?.email ?? ''}</p>
</SettingsSection>

<ChangeEmailDialog open={emailOpen} setOpen={open => (emailOpen = open)} />

<SettingsSection
  title={t(userMessages.signInMethods)}
  description={t(userMessages.signInMethodsDescription)}
>
  <SignInMethods />
</SettingsSection>

<SettingsSection
  title={t(userMessages.password)}
  description={t(userMessages.passwordDescription)}
  actionBar
>
  {#key page.passwordForm}
    <ChangePasswordForm
      isPending={page.isChangingPassword}
      refusal={page.passwordRefusal}
      onSubmit={page.changePassword}
    />
  {/key}
</SettingsSection>

<SettingsSection title={t(userMessages.sessions)} description={t(userMessages.sessionsDescription)}>
  {#snippet action()}
    <Button
      variant="outline"
      size="sm"
      disabled={page.isRevokingSessions}
      onclick={page.signOutOtherSessions}
    >
      {t(userMessages.signOutOthers)}
    </Button>
  {/snippet}
  <SessionList
    sessions={page.sessions}
    isLoading={page.sessionsLoading}
    isError={page.sessionsError}
    canRevoke
    isRevoking={page.isRevokingSession}
    onRevoke={page.revokeSession}
  />
</SettingsSection>
