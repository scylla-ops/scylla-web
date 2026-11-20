<script lang="ts">
  import WorkflowIcon from '@lucide/svelte/icons/workflow';
  import { createQuery } from '@scylla/core-sdk';
  import { ScyllaDialog } from '@scylla/ui';
  import { Input } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { scyllaNavigate } from '@platform/context';
  import { latestVersion } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import { communityMessages } from '@base/features/pipeline/presentation/messages/community.messages.ts';
  import { pipelineQueries } from '@base/features/pipeline/presentation/pipeline.queries.ts';
  import type { FragmentDetail } from './fragment-detail.state.svelte.ts';

  let { detail }: { detail: FragmentDetail } = $props();

  const open = $derived(detail.picker !== null);
  const pipelinesQuery = createQuery(() => ({
    ...pipelineQueries.allOfWorkspace(detail.fragment?.workspaceId ?? null),
    enabled: open && !!detail.fragment,
  }));

  let query = $state('');

  // Only the editor opens a pipeline to change: a file pipeline changes in its repository.
  const pipelines = $derived(
    (pipelinesQuery.data?.items ?? [])
      .filter(pipeline => pipeline.origin.source === 'editor' && !pipeline.origin.archivedAt)
      .filter(pipeline => pipeline.name.toLowerCase().includes(query.trim().toLowerCase())),
  );

  const name = $derived(detail.fragment?.name ?? '');
  const next = $derived(detail.fragment ? latestVersion(detail.fragment).number + 1 : 1);

  const close = () => {
    query = '';
    detail.picker = null;
  };

  const openPipeline = (projectId: string, pipelineId: string) => {
    close();
    scyllaNavigate.goToWorkspaceRoute(`projects/${projectId}/edit/${pipelineId}`);
  };
</script>

<ScyllaDialog
  {open}
  onOpenChange={isOpen => {
    if (!isOpen) close();
  }}
  title={detail.picker === 'publish'
    ? t(communityMessages.publishVersionTitle(name, next))
    : t(communityMessages.usePipelineTitle(name))}
  description={detail.picker === 'publish'
    ? t(communityMessages.publishVersionDescription(name))
    : t(communityMessages.usePipelineDescription(name))}
  class="sm:max-w-md"
>
  <Input bind:value={query} placeholder={t(communityMessages.searchPipelines)} />
  <div class="relative mt-3 max-h-72 overflow-y-auto">
    {#if pipelinesQuery.isLoading}
      <p class="p-2 text-sm text-muted-foreground">{t(communityMessages.loadingPipelines)}</p>
    {:else if !pipelines.length}
      <p class="p-2 text-sm text-muted-foreground">{t(communityMessages.noPipeline)}</p>
    {:else}
      <ul class="flex flex-col">
        {#each pipelines as pipeline (pipeline.id)}
          <li>
            <button
              type="button"
              class="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
              onclick={() => openPipeline(pipeline.projectId, pipeline.id)}
            >
              <WorkflowIcon class="size-4 shrink-0 text-muted-foreground" />
              <span class="truncate">{pipeline.name}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</ScyllaDialog>
