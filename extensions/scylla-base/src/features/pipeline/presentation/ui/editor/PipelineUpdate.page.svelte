<script lang="ts">
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { ErrorState } from '@scylla/ui';
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
  <p>{t(pipelineMessages.loading)}</p>
{:else if pipelineQuery.isError}
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
