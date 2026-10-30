<script lang="ts">
  import { Badge, Button, Skeleton } from '@scylla/ui/primitives';
  import { ErrorState } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { createAccountPage } from './account-page.state.svelte.ts';
  import SessionList from '@base/features/user/presentation/ui/components/SessionList.svelte';
  import SettingsSection from '@base/features/user/presentation/ui/components/SettingsSection.svelte';
  import UserAccessList from '@base/features/user/presentation/ui/components/UserAccessList/UserAccessList.svelte';
  import UserIdentityCard from '@base/features/user/presentation/ui/components/UserIdentityCard.svelte';
  import UserProfileForm from '@base/features/user/presentation/ui/components/UserProfileForm/UserProfileForm.svelte';
  import ThemePicker from '@base/features/user/presentation/ui/components/ThemePicker/ThemePicker.svelte';
  import ChangePasswordForm from './ChangePasswordForm.svelte';
  import DeleteAccountDialog from '../DeleteAccountDialog/DeleteAccountDialog.svelte';
  import { userMessages } from '@base/features/user/presentation/messages/user.messages.ts';

  const page = createAccountPage();
</script>

{#if page.isLoading}
  <Skeleton class="m-4 h-64 rounded-xl" />
{:else if page.isError || !page.me}
  <ErrorState message={t(userMessages.accountLoadError)} />
{:else}
  {@const me = page.me}
  <div class="@container mx-auto w-full max-w-7xl pb-8">
    <div class="mx-auto flex w-full max-w-3xl flex-col gap-6 @5xl:max-w-none">
      <header>
        <h1 class="text-2xl font-semibold">{t(userMessages.account)}</h1>
      </header>

      <div
        class="grid grid-cols-1 gap-6 @5xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)] @5xl:grid-rows-[auto_1fr_auto]"
      >
        <div class="@5xl:col-start-1 @5xl:row-start-1">
          <UserIdentityCard user={me}>
            {#snippet badges()}
              {#if page.systemRole}
                <Badge variant="secondary">{page.systemRole}</Badge>
              {/if}
            {/snippet}
          </UserIdentityCard>
        </div>

        <SettingsSection
          title={t(userMessages.profile)}
          description={t(userMessages.profileDescription)}
          class="@5xl:col-start-1 @5xl:row-start-2"
        >
          <UserProfileForm
            user={me}
            emailEditable={false}
            isPending={page.isSavingProfile}
            onSave={page.saveProfile}
          />
        </SettingsSection>

        <SettingsSection
          title={t(userMessages.appearance)}
          description={t(userMessages.appearanceDescription)}
          class="@5xl:col-start-1 @5xl:row-start-3"
        >
          <ThemePicker />
        </SettingsSection>

        <SettingsSection
          title={t(userMessages.password)}
          description={t(userMessages.passwordDescription)}
          class="@5xl:col-start-2 @5xl:row-span-2 @5xl:row-start-1"
        >
          {#key page.passwordForm}
            <ChangePasswordForm
              isPending={page.isChangingPassword}
              refusal={page.passwordRefusal}
              onSubmit={page.changePassword}
            />
          {/key}
        </SettingsSection>

        <SettingsSection
          title={t(userMessages.sessions)}
          description={t(userMessages.sessionsDescription)}
          fill
          class="@5xl:col-start-3 @5xl:row-span-2 @5xl:row-start-1"
        >
          <div class="flex min-h-0 flex-1 flex-col gap-4">
            <div class="relative @5xl:min-h-40 @5xl:flex-1">
              <div class="relative max-h-96 overflow-y-auto @5xl:absolute @5xl:inset-0 @5xl:max-h-none">
                <SessionList
                  sessions={page.sessions}
                  isLoading={page.sessionsLoading}
                  isError={page.sessionsError}
                  canRevoke
                  isRevoking={page.isRevokingSession}
                  onRevoke={page.revokeSession}
                />
              </div>
            </div>
            <div>
              <Button
                variant="outline"
                disabled={page.isRevokingSessions}
                onclick={page.signOutOtherSessions}
              >
                {t(userMessages.signOutOthers)}
              </Button>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          title={t(userMessages.organizationsAndRoles)}
          class="@5xl:col-start-2 @5xl:row-start-3"
        >
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
          class="@5xl:col-start-3 @5xl:row-start-3"
        >
          <Button variant="destructive" onclick={page.openDelete}>
            {t(userMessages.deleteMyAccount)}
          </Button>
        </SettingsSection>
      </div>
    </div>

    <DeleteAccountDialog
      open={page.deleteOpen}
      onOpenChange={open => (open ? page.openDelete() : page.closeDelete())}
      isPending={page.isDeletingAccount}
      refusal={page.deleteRefusal}
      onConfirm={page.deleteAccount}
    />
  </div>
{/if}
