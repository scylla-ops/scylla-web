<script lang="ts">
  import { Card, Tabs, TabsContent } from '@scylla/ui/primitives';
  import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
  import type { PipelineLayout } from '@base/features/pipeline/domain/structs/pipeline-layout.struct.ts';
  import { createNodePlaces } from './blueprint/node-places.state.svelte.ts';
  import {
    createPipelineDocument,
    type MissingDocument,
  } from './pipeline-document.state.svelte.ts';
  import { pipelineIssueText } from '@base/features/pipeline/presentation/presenters/pipeline-issue.presenter.ts';
  import { warnBeforeUnload } from './unsaved-changes.effect.svelte.ts';
  import { createCanvasCurtain } from './blueprint/canvas/CanvasCurtain/canvas-curtain.state.svelte.ts';
  import CanvasCurtain from './blueprint/canvas/CanvasCurtain/CanvasCurtain.svelte';
  import PipelineBlueprint from './blueprint/PipelineBlueprint.svelte';
  import PipelineEditorHeader from './PipelineEditorHeader/PipelineEditorHeader.svelte';
  import PipelineScripting from './scripting/PipelineScripting/PipelineScripting.svelte';

  interface Props {
    /** `edit` tracks the unsaved changes; `create` does not. */
    mode: 'create' | 'edit';
    submitLabel: string;
    onSubmit: (values: {
      name: string;
      nodes: PipelineNodeEntity[];
      layout?: PipelineLayout;
    }) => void;
    /** The places that the server holds. */
    savedLayout?: PipelineLayout | null;
    /** The ids of the nodes that the server holds: their moves go at once, through `onPlacesMoved`. */
    savedNodeIds?: readonly string[];
    onPlacesMoved?: (places: PipelineLayout) => void;
    /** A default draft, or a fetched pipeline. */
    initialScript?: string;
    projectId?: string;
    isSubmitPending?: boolean;
    /** The pipeline is not here yet: the editor shows its frame, and the canvas waits or fails. */
    missing?: MissingDocument;
    onRetry?: () => void;
  }

  let {
    mode,
    submitLabel,
    onSubmit,
    savedLayout,
    savedNodeIds = [],
    onPlacesMoved,
    initialScript,
    projectId,
    isSubmitPending = false,
    missing,
    onRetry,
  }: Props = $props();

  const doc = createPipelineDocument({
    projectId: () => projectId ?? '',
    initialScript: () => initialScript,
  });
  warnBeforeUnload(() => doc.isDirty);

  const places = createNodePlaces({
    savedIds: () => savedNodeIds,
    save: next => onPlacesMoved?.(next),
  });

  let canvasReady = $state(false);
  const curtain = createCanvasCurtain({
    ready: () => !missing && canvasReady,
    failed: () => missing === 'failed',
  });

  const handleSubmit = () => {
    if (doc.isValid) {
      const layout = places.waiting();
      onSubmit({ name: doc.pipelineName, nodes: doc.nodes, ...(layout && { layout }) });
    }
  };
</script>

<!--
  The script is the document; the scripting tab and the blueprint read and write its nodes. An
  invalid script disables the blueprint. Both panels stay mounted, so CodeMirror keeps its scroll.
  The blueprint mounts with its document: a graph built before would keep the places of an empty one.
-->
<Tabs value="blueprint" class="flex h-full flex-col gap-4">
  <div class="flex w-full items-center justify-between gap-4">
    <PipelineEditorHeader
      onSubmit={handleSubmit}
      {submitLabel}
      {mode}
      {missing}
      submitDisabled={!doc.isValid}
      issue={doc.issue ? pipelineIssueText(doc.issue) : undefined}
      blueprintDisabled={!missing && !doc.isValid}
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
    <Card
      class="relative h-full overflow-hidden bg-card p-0"
      aria-busy={!curtain.revealed && !curtain.failed}
    >
      {#if !missing}
        <div class="h-full" inert={!curtain.revealed}>
          <PipelineBlueprint
            nodes={doc.nodes}
            pipelineName={doc.pipelineName}
            {projectId}
            onNodesChange={nodes => doc.setNodes(nodes)}
            {savedLayout}
            {places}
            onReady={() => (canvasReady = true)}
          />
        </div>
      {/if}
      <CanvasCurtain {curtain} onRetry={() => onRetry?.()} />
    </Card>
  </TabsContent>
</Tabs>
