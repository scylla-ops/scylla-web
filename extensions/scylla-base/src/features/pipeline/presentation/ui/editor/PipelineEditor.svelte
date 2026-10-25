<script lang="ts">
  import { Card, Tabs, TabsContent } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { toast } from '@scylla/ui/utils';
  import type { PipelineStep } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
  import {
    createPipelineDocument,
  } from './pipeline-document.state.svelte.ts';
  import PipelineBlueprint from './blueprint/PipelineBlueprint.svelte';
  import PipelineEditorHeader from './PipelineEditorHeader/PipelineEditorHeader.svelte';
  import PipelineScripting from './scripting/PipelineScripting/PipelineScripting.svelte';
  import { pipelineMessages } from '@base/features/pipeline/presentation/pipeline.messages.ts';

  interface Props {
    /** `edit` tracks the unsaved changes; `create` does not. */
    mode: 'create' | 'edit';
    submitLabel: string;
    onSubmit: (values: { name: string; steps: PipelineStep[] }) => void;
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

  const handleSubmit = () => {
    if (!doc.isValid) return;
    // Said here, before the server answers with a generic refusal.
    if (doc.invalidStepIds.length) {
      toast.error(t(pipelineMessages.invalidStepIds(doc.invalidStepIds.join(', '))));
      return;
    }
    onSubmit({ name: doc.pipelineName, steps: doc.steps });
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
