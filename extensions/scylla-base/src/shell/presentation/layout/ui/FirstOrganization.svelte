<script lang="ts">
  import Loader2Icon from '@lucide/svelte/icons/loader-2';
  import scyllaLogo from '@scylla/ui/assets/logo_scylla.svg';
  import scyllaLogoDark from '@scylla/ui/assets/logo_scylla_dark.svg';
  import { authorizationReady, can, Permission } from '@platform/authz';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@scylla/ui/shadcn';
  import { ScyllaForm, type FormValues } from '@scylla/ui';
  import { activeLocale, t } from '@scylla/ui/i18n';
  import { createOrganizationItems } from '@base/features/organization';
  import { layoutMessages } from './layout.messages.ts';
  import SessionLine from './SessionLine/SessionLine.svelte';
  import { welcomeIn } from './welcome-transition.ts';

  interface Props {
    isPending: boolean;
    onSubmit: (values: FormValues<'name' | 'description'>) => void;
  }

  let { isPending, onSubmit }: Props = $props();

  const items = $derived((activeLocale(), createOrganizationItems()));
  // A system permission: no organization to check it on.
  const canCreate = $derived(can(Permission.CREATE_ORGANIZATION));
</script>

<main in:welcomeIn class="flex h-full w-full flex-col p-2">
  <!-- `pt-16`: the core's dark-mode toggle is fixed in the top-right corner, 56px high. -->
  <div
    class="flex h-full min-h-screen w-full flex-col items-center justify-center bg-background pt-16"
  >
    <img src={scyllaLogo} alt="Scylla" class="mb-8 w-56 dark:hidden" />
    <img src={scyllaLogoDark} alt="Scylla" class="mb-8 hidden w-56 dark:block" />
    <Card class="w-full max-w-md">
      <CardHeader class="text-center">
        <CardTitle class="text-2xl">{t(layoutMessages.welcome)}</CardTitle>
        {#if canCreate}
          <CardDescription>{t(layoutMessages.getStarted)}</CardDescription>
        {:else if authorizationReady()}
          <CardDescription>{t(layoutMessages.noOrganization)}</CardDescription>
        {/if}
      </CardHeader>
      {#if canCreate}
        <CardContent>
          <ScyllaForm {items} {isPending} {onSubmit} buttonLabel={t(layoutMessages.create)} />
        </CardContent>
      {:else if !authorizationReady()}
        <CardContent class="flex justify-center">
          <Loader2Icon role="status" class="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      {/if}
    </Card>
    <!-- The way out of this screen for a user who cannot leave it: the account and the sign-out. -->
    <div class="mt-6 w-full max-w-md">
      <SessionLine />
    </div>
  </div>
</main>
