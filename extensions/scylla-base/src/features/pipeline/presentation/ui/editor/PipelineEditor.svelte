<script lang="ts">
  import { Card, Tabs, TabsContent } from '@scylla/ui/primitives';
  import type { PipelineStepEntity } from '@base/features/pipeline/domain/entities/pipeline-step.entity.ts';
  import {
    createPipelineDocument,
  } from './pipeline-document.state.svelte.ts';
  import { pipelineIssueText } from '@base/features/pipeline/presentation/presenters/pipeline-issue.presenter.ts';
  import { warnBeforeUnload } from './unsaved-changes.effect.svelte.ts';
  import PipelineBlueprint from './blueprint/PipelineBlueprint.svelte';
  import PipelineEditorHeader from './PipelineEditorHeader/PipelineEditorHeader.svelte';
  import PipelineScripting from './scripting/PipelineScripting/PipelineScripting.svelte';

  interface Props {
    /** `edit` tracks the unsaved changes; `create` does not. */
    mode: 'create' | 'edit';
    submitLabel: string;
    onSubmit: (values: { name: string; steps: PipelineStepEntity[] }) => void;
    /** A default draft, or a fetched pipeline. */
    initialScript?: string;
    projectId?: string;
    isSubmitPending?: boolean;
  }

  let {
    mode,
    submitLabel,
    onSubmit,
    initialScript,
    projectId,
    isSubmitPending = false,
  }: Props = $props();

  const doc = createPipelineDocument({
    projectId: () => projectId ?? '',
    initialScript: () => initialScript,
  });
  warnBeforeUnload(() => doc.isDirty);

  const handleSubmit = () => {
    if (doc.isValid) onSubmit({ name: doc.pipelineName, steps: doc.steps });
  };
</script>

<!--
  The script is the document; the scripting tab and the blueprint read and write its steps. An
  invalid script disables the blueprint. Both panels stay mounted, so CodeMirror keeps its scroll.
-->
<Tabs value="blueprint" class="flex h-full flex-col gap-4">
  <div class="flex w-full items-center justify-between gap-4">
    <PipelineEditorHeader
      onSubmit={handleSubmit}
      {submitLabel}
      {mode}
      submitDisabled={!doc.isValid}
      issue={doc.issue ? pipelineIssueText(doc.issue) : undefined}
      blueprintDisabled={!doc.isValid}
      isDirty={doc.isDirty}
      isSaving={isSubmitPending}
      pipelineName={doc.pipelineName}
      onNameChange={name => doc.setName(name)}
    />
  </div>

  <TabsContent value="scripting" class="min-h-0 flex-1 overflow-hidden">
    <PipelineScripting {doc} {projectId} />
  </TabsContent>

  <TabsContent value="blueprint" class="min-h-0 flex-1">
    <Card class="h-full bg-card p-0">
      <PipelineBlueprint
        steps={doc.steps}
        pipelineName={doc.pipelineName}
        {projectId}
        onStepsChange={steps => doc.setSteps(steps)}
      />
    </Card>
  </TabsContent>
</Tabs>
