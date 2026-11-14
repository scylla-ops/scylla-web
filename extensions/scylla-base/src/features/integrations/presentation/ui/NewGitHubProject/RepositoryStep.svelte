<script lang="ts">
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import { GatedButton, ListSkeleton } from '@scylla/ui';
  import { Button, buttonVariants } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { ProviderMark } from '@shared/presentation/ui';
  import { integrationsMessages } from '@base/features/integrations/presentation/messages/integrations.messages.ts';
  import { newProjectMessages as messages } from '@base/features/integrations/presentation/messages/new-project.messages.ts';
  import { repositoryMessages } from '@base/features/integrations/presentation/messages/repository.messages.ts';
  import RepositoryOptions from '../RepositoryOptions.svelte';
  import RepositorySearch from '../RepositorySearch.svelte';
  import type { NewGitHubProject } from './new-github-project.state.svelte.ts';

  interface Props {
    page: NewGitHubProject;
    /** The page of the choice of the kind of project. */
    backHref: string;
    onConnect: () => void;
  }

  let { page, backHref, onConnect }: Props = $props();

  const picker = $derived(page.picker);
  const settingsUrl = $derived(picker.connection?.settingsUrl ?? '');
</script>

{#snippet configure()}
  {#if settingsUrl}
    <a
      href={settingsUrl}
      target="_blank"
      rel="noopener noreferrer"
      class={buttonVariants({ variant: 'outline', size: 'sm' })}
    >
      {t(integrationsMessages.configureOnGitHub)}
      <ExternalLinkIcon class="size-3.5" aria-hidden="true" />
    </a>
  {/if}
{/snippet}

<section class="flex flex-col gap-4 rounded-xl border bg-card p-5">
  {#if !page.canLink}
    <p class="text-center text-sm text-muted-foreground">{t(messages.cannotLink)}</p>
  {:else if picker.loadingConnections}
    <ListSkeleton rows={3} rowClass="h-10 w-full rounded-lg" />
  {:else if !picker.connection}
    <div class="flex flex-col items-center gap-3 rounded-lg border p-6 text-center">
      <span
        class="flex size-12 items-center justify-center rounded-full bg-muted"
        aria-hidden="true"
      >
        <ProviderMark kind="github" class="size-5" />
      </span>
      <p class="text-sm font-medium">{t(messages.notConnectedTitle)}</p>
      <p class="max-w-md text-sm text-muted-foreground">{t(messages.notConnectedBody)}</p>
      <GatedButton
        allowed={page.canConnect && !page.githubUnavailable}
        deniedReason={page.githubUnavailable ?? t(integrationsMessages.onlyAdmins)}
        onclick={onConnect}
      >
        {t(integrationsMessages.connectGitHub)}
      </GatedButton>
    </div>
  {:else}
    <RepositorySearch {picker} />

    {#if picker.loadingRepositories}
      <ListSkeleton rows={4} rowClass="h-13 w-full rounded-md" />
    {:else if picker.options.length === 0}
      <div role="status" class="flex flex-col items-center gap-3 rounded-lg border p-6 text-center">
        <p class="text-sm font-medium">
          {t(picker.searching ? repositoryMessages.noMatch : repositoryMessages.noRepository)}
        </p>
        <p class="max-w-md text-sm text-muted-foreground">{t(messages.noMatchHint)}</p>
        {@render configure()}
      </div>
    {:else}
      <RepositoryOptions {picker} class="max-h-72" />
      {#if picker.more}
        <p class="text-xs text-muted-foreground">{t(repositoryMessages.moreRepositories)}</p>
      {/if}
      <p class="text-xs text-muted-foreground">
        {t(repositoryMessages.notInListGitHub)}
        {#if settingsUrl}
          <a
            href={settingsUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="ml-1 inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
          >
            {t(integrationsMessages.configureOnGitHub)}
            <ExternalLinkIcon class="size-3" aria-hidden="true" />
          </a>
        {/if}
      </p>
    {/if}
  {/if}
</section>

<div class="flex items-center justify-between gap-2">
  <Button href={backHref} variant="outline">
    <ArrowLeftIcon aria-hidden="true" />
    {t(messages.back)}
  </Button>
  <Button disabled={!page.canContinue} onclick={page.continue}>{t(messages.continue)}</Button>
</div>
