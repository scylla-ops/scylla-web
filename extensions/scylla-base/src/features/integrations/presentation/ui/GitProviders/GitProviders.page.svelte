<script lang="ts">
  import { ConfirmOperationAlertDialog, ErrorState, ListSkeleton } from '@scylla/ui';
  import { Badge, Separator } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { gitProvidersMessages as messages } from '@base/features/integrations/presentation/messages/git-providers.messages.ts';
  import { integrationsMessages } from '@base/features/integrations/presentation/messages/integrations.messages.ts';
  import ProviderTile from '../ProviderTile.svelte';
  import CreateGitHubApp from './CreateGitHubApp.svelte';
  import GitHubAppDetails from './GitHubAppDetails.svelte';
  import { createGitProvidersPage } from './git-providers-page.state.svelte.ts';
  import { postOnMount } from './manifest-form.attachments.ts';

  const page = createGitProvidersPage();
</script>

<div class="mx-auto flex w-full max-w-4xl flex-col gap-4 pb-20">
  <div>
    <h1>{t(messages.title)}</h1>
    <p class="text-sm text-muted-foreground">{t(messages.description)}</p>
  </div>

  {#if page.query.isError}
    <ErrorState message={page.query.error?.message} />
  {:else if page.query.isPending}
    <ListSkeleton rows={1} rowClass="h-72 w-full rounded-xl" />
  {:else}
    <section class="flex flex-col gap-4 rounded-xl border bg-card p-5">
      {#if page.app}
        <GitHubAppDetails {page} app={page.app} />
      {:else}
        <CreateGitHubApp {page} />
      {/if}
      <Separator />
      <div class="flex items-center gap-3 text-muted-foreground" data-provider="github-server">
        <ProviderTile provider="github" class="opacity-60" />
        <div class="flex min-w-0 grow flex-col gap-0.5">
          <h2 class="text-sm">{t(integrationsMessages.githubServer)}</h2>
          <p class="text-xs">{t(integrationsMessages.comingLater)}</p>
        </div>
        <Badge variant="secondary">{t(integrationsMessages.later)}</Badge>
      </div>
    </section>
  {/if}
</div>

{#if page.manifest}
  <form method="post" action={page.manifest.postUrl} class="hidden" {@attach postOnMount}>
    <input type="hidden" name="manifest" value={page.manifest.manifest} />
  </form>
{/if}

<ConfirmOperationAlertDialog
  open={page.confirming}
  onOpenChange={page.setConfirming}
  title={t(messages.removeTitle)}
  description={t(messages.removeBody)}
  continueLabel={t(messages.removeContinue)}
  isLoading={page.removing}
  onContinue={page.remove}
/>
