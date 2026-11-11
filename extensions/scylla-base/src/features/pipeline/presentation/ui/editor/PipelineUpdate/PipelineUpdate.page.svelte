<script lang="ts">
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import {
    pipelineMutations,
    pipelineQueries,
  } from '@base/features/pipeline/presentation/pipeline.queries.ts';
  import { toDocument } from '@base/features/pipeline/presentation/mappers/pipeline-document.mapper.ts';
  import PipelineEditor from '../PipelineEditor.svelte';
  import type { MissingDocument } from '../pipeline-document.state.svelte.ts';
  import { pipelineMessages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';

  interface Props {
    pipelineId?: string;
  }

  let { pipelineId }: Props = $props();

  const pipelineQuery = createQuery(() => pipelineQueries.byId(pipelineId ?? ''));
  const updatePipeline = createMutation(() => pipelineMutations.update());
  const saveLayout = createMutation(() => pipelineMutations.saveLayout(pipelineId ?? ''));

  const pipeline = $derived(pipelineQuery.data?.pipeline);

  const initialScript = $derived(pipeline ? toDocument(pipeline) : undefined);

  const missing = $derived<MissingDocument | undefined>(
    pipelineQuery.isLoading ? 'loading' : pipelineQuery.isLoadingError ? 'failed' : undefined,
  );
</script>

<!-- The editor shows its frame at once: the canvas waits for the pipeline, or says it failed. -->
<div class="flex h-full flex-col gap-4">
  <PipelineEditor
    mode="edit"
    submitLabel={t(pipelineMessages.save)}
    projectId={pipeline?.projectId}
    {pipelineId}
    {initialScript}
    {missing}
    onRetry={() => void pipelineQuery.refetch()}
    savedLayout={pipelineQuery.data?.layout}
    savedNodeIds={pipeline?.nodes.map(node => node.id)}
    onPlacesMoved={places => saveLayout.mutate(places)}
    onSubmit={values => {
      if (pipelineId && pipeline)
        updatePipeline.mutate({ id: pipelineId, projectId: pipeline.projectId, ...values });
    }}
    isSubmitPending={updatePipeline.isPending}
  />
</div>
