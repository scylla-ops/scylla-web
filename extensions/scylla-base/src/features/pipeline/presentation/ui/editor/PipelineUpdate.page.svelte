<script lang="ts">
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { ErrorState } from '@scylla/ui';
  import { Skeleton } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import {
    pipelineMutations,
    pipelineQueries,
  } from '@base/features/pipeline/presentation/pipeline.queries.ts';
  import { toDocument } from '@base/features/pipeline/presentation/mappers/pipeline-document.mapper.ts';
  import PipelineEditor from './PipelineEditor.svelte';
  import { pipelineMessages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';

  interface Props {
    pipelineId?: string;
  }

  let { pipelineId }: Props = $props();

  const pipelineQuery = createQuery(() => pipelineQueries.byId(pipelineId ?? ''));
  const updatePipeline = createMutation(() => pipelineMutations.update());

  const pipeline = $derived(pipelineQuery.data);

  const initialScript = $derived(pipeline ? toDocument(pipeline) : undefined);
</script>

{#if pipelineQuery.isLoading}
  <!-- The bar of the editor, then its canvas. -->
  <div class="flex h-full w-full flex-col gap-4" role="status" aria-busy="true">
    <div class="flex items-center gap-3">
      <Skeleton class="h-9 w-64" />
      <Skeleton class="h-9 w-44" />
      <Skeleton class="ml-auto h-9 w-24" />
    </div>
    <Skeleton class="min-h-[420px] w-full flex-1 rounded-xl" />
  </div>
{:else if pipelineQuery.isLoadingError}
  <ErrorState message={t(pipelineMessages.loadPipelineError)} />
{:else}
  <div class="flex h-full flex-col gap-4">
    <PipelineEditor
      mode="edit"
      submitLabel={t(pipelineMessages.save)}
      projectId={pipeline?.projectId}
      {initialScript}
      onSubmit={({ name, nodes }) => {
        if (pipelineId && pipeline)
          updatePipeline.mutate({ id: pipelineId, projectId: pipeline.projectId, name, nodes });
      }}
      isSubmitPending={updatePipeline.isPending}
    />
  </div>
{/if}
