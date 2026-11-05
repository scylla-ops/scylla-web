<script lang="ts">
  import BlocksIcon from '@lucide/svelte/icons/blocks';
  import FolderIcon from '@lucide/svelte/icons/folder';
  import SearchIcon from '@lucide/svelte/icons/search';
  import ServerIcon from '@lucide/svelte/icons/server';
  import WorkflowIcon from '@lucide/svelte/icons/workflow';
  import { can, Permission } from '@platform/authz';
  import { contextStore, navigateTo, workspaceUrl } from '@platform/context';
  import { createQuery } from '@scylla/core-sdk';
  import { Dialog, DialogContent, DialogTitle, Input } from '@scylla/ui/primitives';
  import { toRune } from '@scylla/ui/stores';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { appQueries } from '@base/features/apps';
  import { pipelineQueries } from '@base/features/pipeline';
  import { projectQueries } from '@base/features/project';
  import { layoutMessages } from '@base/shell/presentation/layout/messages/layout.messages.ts';
  import { searchResults, type SearchResult, type SearchResultKind } from './search-results.presenter.ts';

  const ICONS: Record<SearchResultKind, typeof SearchIcon> = {
    project: FolderIcon,
    pipeline: WorkflowIcon,
    agent: ServerIcon,
    app: BlocksIcon,
  };

  const context = toRune(contextStore);
  const workspace = $derived(context().workspace);
  const workspaceId = $derived(workspace.id);
  const target = $derived({ workspaceId: workspaceId ?? undefined });

  let open = $state(false);
  let text = $state('');
  let highlighted = $state(0);

  // Read when the dialog opens: the top bar is on each page.
  const projects = createQuery(() => ({
    ...projectQueries.lookup(workspaceId),
    enabled: open && !!workspaceId && can(Permission.LIST_PROJECTS_BY_WORKSPACE, target),
  }));
  const pipelines = createQuery(() => ({
    ...pipelineQueries.byWorkspace(workspaceId),
    enabled: open && !!workspaceId && can(Permission.LIST_PIPELINES_BY_WORKSPACE, target),
  }));
  const apps = createQuery(() => ({
    ...appQueries.list(workspaceId ?? ''),
    enabled: open && !!workspaceId && can(Permission.LIST_APPS_BY_WORKSPACE, target),
  }));

  const results = $derived(
    searchResults(
      {
        projects: projects.data?.items ?? [],
        pipelines: pipelines.data?.items ?? [],
        apps: apps.data ?? [],
      },
      text,
    ),
  );

  const shortcut = $derived(
    typeof navigator !== 'undefined' && /mac/i.test(navigator.userAgent) ? '⌘K' : 'Ctrl K',
  );

  const go = (result: SearchResult | undefined) => {
    if (!result || !workspace.slug) return;
    open = false;
    text = '';
    navigateTo(workspaceUrl(workspace.slug, result.path));
  };

  const onWindowKey = (event: KeyboardEvent) => {
    if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      open = !open;
    }
  };

  const onInputKey = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      highlighted = Math.min(highlighted + 1, results.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      highlighted = Math.max(highlighted - 1, 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(results[highlighted]);
    }
  };

  $effect(() => {
    void text;
    highlighted = 0;
  });
</script>

<svelte:window onkeydown={onWindowKey} />

<button
  type="button"
  class="flex h-8 shrink-0 items-center gap-2 rounded-lg border border-border px-2 text-sm text-muted-foreground transition-colors outline-hidden hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none lg:w-75 lg:px-2.5"
  aria-label={t(layoutMessages.search)}
  onclick={() => (open = true)}
>
  <SearchIcon class="size-4 shrink-0" aria-hidden="true" />
  <span class="hidden min-w-0 flex-1 truncate text-left lg:block">
    {t(layoutMessages.searchPlaceholder)}
  </span>
  <kbd class="hidden rounded-md bg-muted px-1.5 py-0.5 font-sans text-xs lg:block">{shortcut}</kbd>
</button>

<Dialog bind:open>
  <DialogContent class="top-[20%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg">
    <DialogTitle class="sr-only">{t(layoutMessages.search)}</DialogTitle>
    <div class="border-b border-border p-2 pr-10">
      <Input
        bind:value={text}
        class="border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
        placeholder={t(layoutMessages.searchPlaceholder)}
        aria-label={t(layoutMessages.search)}
        onkeydown={onInputKey}
      />
    </div>
    {#if text.trim()}
      <ul class="relative flex max-h-80 flex-col gap-0.5 overflow-y-auto p-1">
        {#each results as result, index (`${result.kind}:${result.id}`)}
          {@const Icon = ICONS[result.kind]}
          <li>
            <button
              type="button"
              class={cn(
                'flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm',
                index === highlighted && 'bg-accent',
              )}
              onpointermove={() => (highlighted = index)}
              onclick={() => go(result)}
            >
              <Icon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span class="min-w-0 flex-1 truncate">{result.name}</span>
            </button>
          </li>
        {:else}
          <li class="px-2 py-6 text-center text-sm text-muted-foreground">
            {t(layoutMessages.searchNoResult)}
          </li>
        {/each}
      </ul>
    {/if}
  </DialogContent>
</Dialog>
