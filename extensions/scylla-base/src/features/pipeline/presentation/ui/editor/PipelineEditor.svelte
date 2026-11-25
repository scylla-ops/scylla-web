<script lang="ts">
  import { untrack } from 'svelte';
  import { createSearchParams } from '@platform/context';
  import { Card, Tabs, TabsContent } from '@scylla/ui/primitives';
  import UnsavedChangesDialog from './UnsavedChangesDialog.svelte';
  import type { FragmentLink } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
  import type { PipelineLayout } from '@base/features/pipeline/domain/structs/pipeline-layout.struct.ts';
  import { createNodePlaces } from './blueprint/node-places.state.svelte.ts';
  import {
    createPipelineDocument,
    type MissingDocument,
  } from './pipeline-document.state.svelte.ts';
  import { pipelineIssueText } from '@base/features/pipeline/presentation/presenters/pipeline-issue.presenter.ts';
  import { ScyllaError } from '@shared/utils/scylla-error.ts';
  import { createFragmentLinks } from './fragment-links.state.svelte.ts';
  import { warnBeforeUnload } from './unsaved-changes.effect.svelte.ts';
  import { createUnsavedChanges } from './unsaved-changes.state.svelte.ts';
  import { createPipelineKeyCheck } from './pipeline-key-check.state.svelte.ts';
  import { createCanvasCurtain } from './blueprint/canvas/CanvasCurtain/canvas-curtain.state.svelte.ts';
  import CanvasCurtain from './blueprint/canvas/CanvasCurtain/CanvasCurtain.svelte';
  import PipelineBlueprint from './blueprint/PipelineBlueprint.svelte';
  import PipelineEditorHeader from './PipelineEditorHeader/PipelineEditorHeader.svelte';
  import ExportPipelineDialog from './ExportPipelineDialog/ExportPipelineDialog.svelte';
  import PipelineScripting from './scripting/PipelineScripting/PipelineScripting.svelte';

  interface Props {
    /** `edit` tracks the unsaved changes; `create` does not. */
    mode: 'create' | 'edit';
    submitLabel: string;
    /**
     * Sends the document. Call `done` when the save succeeds: the sent version becomes the saved
     * one, then `onSaved` runs.
     */
    onSubmit: (
      values: {
        name: string;
        nodes: PipelineNodeEntity[];
        layout?: PipelineLayout;
        links: FragmentLink[];
      },
      done: () => void,
    ) => void;
    /** A save succeeded and the editor has no unsaved change from it: the page can leave. */
    onSaved?: () => void;
    /** The places that the server holds. */
    savedLayout?: PipelineLayout | null;
    /** The ids of the nodes that the server holds: their moves go at once, through `onPlacesMoved`. */
    savedNodeIds?: readonly string[];
    onPlacesMoved?: (places: PipelineLayout) => void;
    /** A default draft, or a fetched pipeline. */
    initialScript?: string;
    /** The fragments that the saved pipeline links. A new pipeline links none. */
    initialLinks?: FragmentLink[];
    projectId?: string;
    /** A saved pipeline: the header can export it as a file. */
    pipelineId?: string;
    /** The saved name of a saved pipeline: a name with its key stays free. */
    savedName?: string;
    /** Why the saved pipeline cannot be exported. */
    exportIssue?: string;
    /** The saved agent labels of a saved pipeline, or the labels of a new pipeline. */
    agentLabels?: readonly string[];
    /** A new pipeline: the labels change in the page, and Create sends them. */
    onAgentLabelsChange?: (labels: string[]) => void;
    isSubmitPending?: boolean;
    /** The last save failed: the header shows it until the next edit or save. */
    submitError?: Error | null;
    /** The pipeline is not here yet: the editor shows its frame, and the canvas waits or fails. */
    missing?: MissingDocument;
    onRetry?: () => void;
  }

  let {
    mode,
    submitLabel,
    onSubmit,
    onSaved,
    savedLayout,
    savedNodeIds = [],
    onPlacesMoved,
    initialScript,
    initialLinks,
    projectId,
    pipelineId,
    savedName,
    exportIssue,
    agentLabels,
    onAgentLabelsChange,
    isSubmitPending = false,
    submitError,
    missing,
    onRetry,
  }: Props = $props();

  const doc = createPipelineDocument({
    projectId: () => projectId ?? '',
    initialScript: () => initialScript,
  });
  const links = createFragmentLinks({ initial: () => initialLinks });
  const changes = createUnsavedChanges(doc, links);
  const keyCheck = createPipelineKeyCheck({
    projectId: () => projectId ?? '',
    savedName: () => savedName,
  });
  // A pipeline file has the key of the name: the server refuses it.
  const keyIssue = $derived(keyCheck.issueOf(doc.pipelineName));
  const isDirty = $derived(changes.isDirty);
  // A failed save leaves the changes unsaved; the next edit hides the failure.
  const editSignature = $derived(doc.script + JSON.stringify(links.current));
  const failedAt = $derived(submitError ? untrack(() => editSignature) : undefined);
  const saveError = $derived(
    submitError && failedAt === editSignature
      ? ScyllaError.from(submitError).mutationMessage()
      : undefined,
  );
  let pendingLeave = $state<(() => void) | null>(null);
  warnBeforeUnload(
    () => isDirty,
    leave => (pendingLeave = leave),
  );

  const places = createNodePlaces({
    savedIds: () => savedNodeIds,
    save: next => onPlacesMoved?.(next),
  });

  let canvasReady = $state(false);
  // In the URL: the merge rules of the repository open the export (`?export=file`).
  const search = createSearchParams(['export']);
  const exporting = $derived(!!pipelineId && !exportIssue && search.values.export !== '');
  const setExporting = (open: boolean) => search.write({ export: open ? 'file' : '' });
  const curtain = createCanvasCurtain({
    ready: () => !missing && canvasReady,
    failed: () => missing === 'failed',
  });

  const handleSubmit = () => {
    if (doc.isValid && !keyIssue) {
      const layout = places.waiting();
      const saved = changes.send();
      onSubmit(
        {
          name: doc.pipelineName,
          nodes: doc.nodes,
          links: links.current,
          ...(layout && { layout }),
        },
        () => {
          saved();
          onSaved?.();
        },
      );
    }
  };
</script>

<!--
  The script is the document; the scripting tab and the blueprint read and write its nodes. An
  invalid script disables the blueprint. Both panels stay mounted, so CodeMirror keeps its scroll.
  The blueprint mounts with its document: a graph built before would keep the places of an empty one.
-->
<Tabs value="blueprint" class="flex h-full flex-col gap-4">
  <!-- A container: a narrow editor puts the name on a row of its own (`PipelineEditorHeader`). -->
  <div class="@container flex w-full items-center justify-between gap-4">
    <PipelineEditorHeader
      onSubmit={handleSubmit}
      {submitLabel}
      {mode}
      {missing}
      submitDisabled={!doc.isValid || !!keyIssue}
      issue={doc.issue ? pipelineIssueText(doc.issue) : undefined}
      blueprintDisabled={!missing && !doc.isValid}
      {isDirty}
      isSaving={isSubmitPending}
      {saveError}
      pipelineName={doc.pipelineName}
      onNameChange={name => doc.setName(name)}
      onNameDraft={name => changes.typeName(name)}
      keyIssueOf={name => keyCheck.issueOf(name)}
      onExport={pipelineId ? () => setExporting(true) : undefined}
      {exportIssue}
      {pipelineId}
      {agentLabels}
      {onAgentLabelsChange}
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
            {pipelineId}
            onNodesChange={nodes => doc.setNodes(nodes)}
            links={links.current}
            onLinksChange={next => links.set(next)}
            linkable={!!pipelineId}
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

{#if pipelineId}
  <ExportPipelineDialog
    open={exporting}
    onOpenChange={setExporting}
    {pipelineId}
    pipelineName={doc.pipelineName}
    dirty={isDirty}
  />
{/if}

<UnsavedChangesDialog
  open={pendingLeave !== null}
  onStay={() => (pendingLeave = null)}
  onLeave={() => {
    const leave = pendingLeave;
    pendingLeave = null;
    leave?.();
  }}
/>
