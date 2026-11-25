<script lang="ts">
  import { createMutation } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import {
    pipelineMutations,
    returnToProject,
  } from '@base/features/pipeline/presentation/pipeline.queries.ts';
  import { newPipeline } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
  import { toDocument } from '@base/features/pipeline/presentation/mappers/pipeline-document.mapper.ts';
  import PipelineEditor from './PipelineEditor.svelte';
  import { pipelineMessages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';

  interface Props {
    projectId?: string;
  }

  let { projectId }: Props = $props();

  const createPipeline = createMutation(() => pipelineMutations.create());

  /** Sent with the creation: the first job of the pipeline already asks them. */
  let agentLabels = $state<string[]>([]);

  const initialScript = $derived(projectId ? toDocument(newPipeline(projectId)) : undefined);
</script>

{#if !projectId}
  <p>{t(pipelineMessages.selectProjectFirst)}</p>
{:else}
  <div data-tour="pipeline-editor" class="flex h-full flex-col gap-4">
    <PipelineEditor
      mode="create"
      submitLabel={t(pipelineMessages.create)}
      {projectId}
      {initialScript}
      {agentLabels}
      onAgentLabelsChange={labels => (agentLabels = labels)}
      onSubmit={(values, done) =>
        createPipeline.mutate({ projectId, ...values, agentLabels }, { onSuccess: done })}
      onSaved={returnToProject}
      isSubmitPending={createPipeline.isPending}
      submitError={createPipeline.error}
    />
  </div>
{/if}
