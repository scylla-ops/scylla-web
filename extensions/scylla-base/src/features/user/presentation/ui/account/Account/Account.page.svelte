<script lang="ts">
  import { Redirect } from '@scylla/core-sdk';
  import { Button, Skeleton } from '@scylla/ui/primitives';
  import { ErrorState } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { createAccountPage } from './account-page.state.svelte.ts';
  import { accountSection } from './account-sections.registry.ts';
  import AccountHeader from './AccountHeader.svelte';
  import AccountNav from './AccountNav.svelte';
  import AccountSecurity from './AccountSecurity.svelte';
  import SettingsSection from '@base/features/user/presentation/ui/components/SettingsSection.svelte';
  import ThemePicker from '@base/features/user/presentation/ui/components/ThemePicker/ThemePicker.svelte';
  import UserAccessList from '@base/features/user/presentation/ui/components/UserAccessList/UserAccessList.svelte';
  import UserProfileForm from '@base/features/user/presentation/ui/components/UserProfileForm/UserProfileForm.svelte';
  import DeleteAccountDialog from '../DeleteAccountDialog/DeleteAccountDialog.svelte';
  import { userMessages } from '@base/features/user/presentation/messages/user.messages.ts';

  interface Props {
    /** Absent on the `personal` mount (`/account/<section>`). */
    organizationSlug?: string;
    section?: string;
  }

  let { organizationSlug, section }: Props = $props();

  const page = createAccountPage();
  const current = $derived(accountSection(section));
  const base = $derived(organizationSlug ? `/${organizationSlug}/account` : '/account');
</script>

{#if !current}
  <Redirect to="../profile" />
{:else if page.isLoading}
  <Skeleton class="m-4 h-64 rounded-xl" />
{:else if page.isError || !page.me}
  <ErrorState message={t(userMessages.accountLoadError)} />
{:else}
  {@const me = page.me}
  <div class="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-8">
    <AccountHeader user={me} systemRole={page.systemRole} />

    <div class="flex flex-col gap-6 md:flex-row md:items-start md:gap-10">
      <AccountNav {base} current={current.id} />

      <div class="flex min-w-0 flex-1 flex-col gap-6">
        {#if current.id === 'profile'}
          <SettingsSection
            title={t(userMessages.profile)}
            description={t(userMessages.profileDescription)}
            actionBar
          >
            <UserProfileForm
              user={me}
              emailEditable={false}
              isPending={page.isSavingProfile}
              onSave={page.saveProfile}
            />
          </SettingsSection>
        {:else if current.id === 'appearance'}
          <SettingsSection
            title={t(userMessages.appearance)}
            description={t(userMessages.appearanceDescription)}
          >
            <ThemePicker />
          </SettingsSection>
        {:else if current.id === 'security'}
          <AccountSecurity {page} />
        {:else if current.id === 'organizations'}
          <SettingsSection
            title={t(userMessages.organizationsAndRoles)}
            description={t(userMessages.organizationsDescription)}
          >
            <UserAccessList
              access={page.access}
              isLoading={page.accessLoading}
              isError={page.accessError}
            />
          </SettingsSection>
        {:else}
          <SettingsSection
            title={t(userMessages.deleteMyAccount)}
            description={t(userMessages.deleteMyAccountDescription)}
            tone="danger"
          >
            {#snippet action()}
              <Button variant="destructive" size="sm" onclick={page.openDelete}>
                {t(userMessages.deleteMyAccount)}
              </Button>
            {/snippet}
          </SettingsSection>
        {/if}
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
