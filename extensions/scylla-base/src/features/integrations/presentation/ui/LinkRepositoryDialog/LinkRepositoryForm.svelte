<script lang="ts">
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import { ListSkeleton } from '@scylla/ui';
  import { Button, buttonVariants, DialogFooter } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { integrationsMessages } from '@base/features/integrations/presentation/messages/integrations.messages.ts';
  import { repositoryMessages as messages } from '@base/features/integrations/presentation/messages/repository.messages.ts';
  import { integrationsUrl } from '@base/features/integrations/presentation/presenters/integrations-url.presenter.ts';
  import RepositoryOptions from '../RepositoryOptions.svelte';
  import RepositorySearch from '../RepositorySearch.svelte';
  import { createLinkRepository } from './link-repository.state.svelte.ts';

  interface Props {
    projectId: string;
    workspaceId: string;
    workspaceSlug: string;
    canViewIntegrations: boolean;
    onClose: () => void;
  }

  let { projectId, workspaceId, workspaceSlug, canViewIntegrations, onClose }: Props = $props();

  const form = createLinkRepository({
    projectId: () => projectId,
    workspaceId: () => workspaceId,
    onLinked: () => onClose(),
  });

  const picker = form.picker;
  const github = $derived(picker.connection?.provider === 'github');
</script>

<form
  class="flex flex-col gap-4"
  novalidate
  onsubmit={event => {
    event.preventDefault();
    form.submit();
  }}
>
  {#if picker.loadingConnections}
    <ListSkeleton rows={3} rowClass="h-10 w-full rounded-lg" />
  {:else if !picker.connection}
    <div class="flex flex-col items-center gap-3 rounded-lg border p-6 text-center">
      <p class="max-w-sm text-sm text-muted-foreground">{t(messages.noConnection)}</p>
      {#if canViewIntegrations && workspaceSlug}
        <a href={integrationsUrl(workspaceSlug)} class={buttonVariants({ variant: 'outline' })}>
          {t(messages.openIntegrations)}
        </a>
      {/if}
    </div>
  {:else}
    <RepositorySearch {picker} />

    {#if picker.loadingRepositories}
      <ListSkeleton rows={3} rowClass="h-13 w-full rounded-md" />
    {:else if picker.options.length === 0}
      <p role="status" class="rounded-lg border p-4 text-center text-sm text-muted-foreground">
        {t(picker.searching ? messages.noMatch : messages.noRepository)}
      </p>
    {:else}
      <RepositoryOptions {picker} class="max-h-64" />
    {/if}

    {#if picker.more}
      <p class="text-xs text-muted-foreground">{t(messages.moreRepositories)}</p>
    {/if}

    <p class="text-xs text-muted-foreground">
      {t(github ? messages.notInListGitHub : messages.notInListGitLab)}
      {#if github && picker.connection.settingsUrl}
        <a
          href={picker.connection.settingsUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="ml-1 inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
        >
          {t(integrationsMessages.configureOnGitHub)}
          <ExternalLinkIcon class="size-3" aria-hidden="true" />
        </a>
      {/if}
    </p>

    {#if form.error}
      <p role="alert" class="text-sm text-destructive">{form.error}</p>
    {/if}
  {/if}

  <DialogFooter>
    <Button type="button" variant="outline" data-dialog-dismiss onclick={onClose}>
      {t(messages.cancel)}
    </Button>
    <Button type="submit" disabled={!form.canSubmit}>{t(messages.link)}</Button>
  </DialogFooter>
</form>
