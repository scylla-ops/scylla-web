<script lang="ts">
  import Loader2Icon from '@lucide/svelte/icons/loader-2';
  import scyllaLogo from '@scylla/ui/assets/logo_scylla.svg';
  import scyllaLogoDark from '@scylla/ui/assets/logo_scylla_dark.svg';
  import { authorizationReady, can, Permission } from '@platform/authz';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@scylla/ui/primitives';
  import { IconField, ScyllaForm, type FormValues, type IconChoice } from '@scylla/ui';
  import { activeLocale, t } from '@scylla/ui/i18n';
  import { recentColors } from '@base/features/project';
  import {
    createWorkspaceItems,
    DEFAULT_WORKSPACE_COLOR,
    DEFAULT_WORKSPACE_GLYPH,
  } from '@base/features/workspace';
  import { layoutMessages } from '@base/shell/presentation/layout/messages/layout.messages.ts';
  import NotificationsMenu from '../NotificationsMenu/NotificationsMenu.svelte';
  import SessionLine from '../SessionLine/SessionLine.svelte';
  import { welcomeIn } from './welcome.transition.ts';

  interface Props {
    isPending: boolean;
    onSubmit: (values: FormValues<'name' | 'slug'>, icon: IconChoice) => void;
  }

  let { isPending, onSubmit }: Props = $props();

  const items = $derived((activeLocale(), createWorkspaceItems()));
  // A system permission: no workspace to check it on.
  const canCreate = $derived(can(Permission.CREATE_WORKSPACE));
  // The same icon field as the dialog of the switcher.
  let icon = $state<IconChoice>({ kind: 'default' });
  const recent = recentColors();
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
          <CardDescription>{t(layoutMessages.noWorkspace)}</CardDescription>
        {/if}
      </CardHeader>
      {#if canCreate}
        <CardContent>
          <ScyllaForm
            {items}
            {isPending}
            onSubmit={values => onSubmit(values, icon)}
            buttonLabel={t(layoutMessages.create)}
          >
            {#snippet leading()}
              <IconField
                value={icon}
                onchange={next => (icon = next)}
                {recent}
                defaultGlyph={DEFAULT_WORKSPACE_GLYPH}
                defaultColor={DEFAULT_WORKSPACE_COLOR}
                disabled={isPending}
              />
            {/snippet}
          </ScyllaForm>
        </CardContent>
      {:else if !authorizationReady()}
        <CardContent class="flex justify-center">
          <Loader2Icon role="status" class="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      {/if}
    </Card>
    <!-- The way out of this screen for a user who cannot leave it: the account and the sign-out. -->
    <div class="mt-6 flex w-full max-w-md items-center justify-center gap-3">
      <SessionLine />
      <!-- An invitation reaches a user with no workspace here. -->
      <NotificationsMenu />
    </div>
  </div>
</main>
