<script lang="ts">
  import { Redirect, createMutation, createQuery } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import {
    pipelineMutations,
    pipelineQueries,
  } from '@base/features/pipeline/presentation/pipeline.queries.ts';
  import { fragmentQueries } from '@base/features/pipeline/presentation/fragment.queries.ts';
  import { toDocument } from '@base/features/pipeline/presentation/mappers/pipeline-document.mapper.ts';
  import PipelineEditor from '../PipelineEditor.svelte';
  import type { MissingDocument } from '../pipeline-document.state.svelte.ts';
  import { pipelineMessages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';
  import { exportMessages } from '@base/features/pipeline/presentation/messages/export.messages.ts';
  import { hasConditionalNodes } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';

  interface Props {
    pipelineId?: string;
  }

  let { pipelineId }: Props = $props();

  const pipelineQuery = createQuery(() => pipelineQueries.byId(pipelineId ?? ''));
  const linksQuery = createQuery(() => fragmentQueries.links(pipelineId ?? ''));
  const updatePipeline = createMutation(() => pipelineMutations.update());
  const saveLayout = createMutation(() => pipelineMutations.saveLayout(pipelineId ?? ''));

  const pipeline = $derived(pipelineQuery.data?.pipeline);

  const initialScript = $derived(pipeline ? toDocument(pipeline) : undefined);

  // A file pipeline changes in its repository: it has a read-only page of its own.
  const fromFile = $derived(pipelineQuery.data?.origin.source === 'file');

  const missing = $derived<MissingDocument | undefined>(
    pipelineQuery.isLoadingError
      ? 'failed'
      : pipelineQuery.isLoading || linksQuery.isLoading
        ? 'loading'
        : undefined,
  );
</script>

{#if fromFile}
  <Redirect to="../../pipelines/{pipelineId}" />
{/if}

<!-- The editor shows its frame at once: the canvas waits for the pipeline, or says it failed. -->
<div class="flex h-full flex-col gap-4">
  <PipelineEditor
    mode="edit"
    submitLabel={t(pipelineMessages.save)}
    projectId={pipeline?.projectId}
    {pipelineId}
    exportIssue={pipeline && hasConditionalNodes(pipeline.nodes)
      ? t(exportMessages.conditionalNodes)
      : undefined}
    {initialScript}
    agentLabels={pipeline ? (pipeline.agentLabels ?? []) : undefined}
    initialLinks={linksQuery.data}
    {missing}
    onRetry={() => void pipelineQuery.refetch()}
    savedLayout={pipelineQuery.data?.layout}
    savedNodeIds={pipeline?.nodes.map(node => node.id)}
    onPlacesMoved={places => saveLayout.mutate(places)}
    onSubmit={(values, done) => {
      if (pipelineId && pipeline)
        updatePipeline.mutate(
          { id: pipelineId, projectId: pipeline.projectId, ...values },
          { onSuccess: done },
        );
    }}
    isSubmitPending={updatePipeline.isPending}
    submitError={updatePipeline.error}
  />
</div>
