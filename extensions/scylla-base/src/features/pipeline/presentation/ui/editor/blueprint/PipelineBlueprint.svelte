<script lang="ts">
  import type { Snippet } from 'svelte';
  import { SvelteFlowProvider } from '@xyflow/svelte';
  import { createQuery } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import { ResizableHandle, ResizablePane, ResizablePaneGroup } from '@scylla/ui/primitives';
  import { createCompactContainer } from '@scylla/ui/state';
  import { cn } from '@scylla/ui/utils';
  import {
    latestVersion,
    valuesOf,
    type FragmentEntity,
    type FragmentLink,
  } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
  import type { PipelineLayout } from '@base/features/pipeline/domain/structs/pipeline-layout.struct.ts';
  import type { NodePlaces } from './node-places.state.svelte.ts';
  import { createBlueprint } from './blueprint.state.svelte.ts';
  import { createNodeAppearancePreference } from './canvas/node-appearance-preference.state.svelte.ts';
  import { nodeTemplateQueries } from '@base/features/pipeline/presentation/pipeline.queries.ts';
  import { createQuickAdd } from '@base/features/pipeline/presentation/ui/editor/blueprint/catalog/QuickAddMenu/quick-add.state.svelte.ts';
  import BlueprintCanvas from './canvas/BlueprintCanvas.svelte';
  import { catalogEntries, catalogText } from '@base/features/pipeline/presentation/presenters/catalog.presenter.ts';
  import PaletteDragGhost from './palette-drag/PaletteDragGhost.svelte';
  import { createPaletteDrag } from './palette-drag/palette-drag.state.svelte.ts';
  import { nodePositionAt } from './canvas/nodes/node-appearances.registry.ts';
  import BlueprintSidePanel from './side-panel/BlueprintSidePanel.svelte';
  import { pipelineMessages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';
  import { firstProposal } from '@base/features/pipeline/presentation/presenters/fragment.presenter.ts';
  import { createEditorLibrary } from './editor-library.state.svelte.ts';
  import SaveFragmentDialog from './SaveFragmentDialog/SaveFragmentDialog.svelte';
  import UpdateNotice from './canvas/UpdateNotice.svelte';

  interface Props {
    nodes: PipelineNodeEntity[];
    pipelineName: string;
    projectId?: string;
    onNodesChange: (nodes: PipelineNodeEntity[]) => void;
    /** The fragments that the pipeline links. None: the nodes are drawn one by one. */
    links?: FragmentLink[];
    onLinksChange?: (links: FragmentLink[]) => void;
    /** `false`: the pipeline is not saved yet, so it cannot link a fragment. */
    linkable?: boolean;
    savedLayout?: PipelineLayout | null;
    places?: NodePlaces;
    /** Called once: the graph is fitted in the canvas at its final size. */
    onReady?: () => void;
    /** The graph only shows the pipeline: no edit, no place saved. */
    locked?: boolean;
    /** The nodes are an older version than the one the page talks about: they are faded. */
    dimmed?: boolean;
    /** Over the canvas, in place of the notice of the repeated ids. */
    notice?: Snippet;
    /** A `ResizablePane` of order 2, in place of the palette and the inspector. */
    sidePanel?: Snippet;
  }

  let {
    nodes,
    pipelineName,
    projectId,
    onNodesChange,
    links = [],
    onLinksChange,
    linkable = false,
    savedLayout,
    places,
    onReady,
    locked = false,
    dimmed = false,
    notice,
    sidePanel,
  }: Props = $props();

  /** Narrower than this, the side panel goes under the canvas: beside it, its rows do not fit. */
  const STACK_BELOW_PX = 640;
  const width = createCompactContainer(STACK_BELOW_PX);
  const stacked = $derived(width.isCompact);

  /** The panes have their sizes: the canvas mounts at its final width, and fits only once. */
  let laidOut = $state(false);
  /** The view is fitted: from now on, a change of the panes is animated. */
  let ready = $state(false);

  const blueprint = createBlueprint({
    nodes: () => nodes,
    pipelineName: () => pipelineName,
    // Read at call time, so a swapped callback is the one called.
    onNodesChange: next => onNodesChange(next),
    links: () => links,
    onLinksChange: next => onLinksChange?.(next),
    savedLayout: () => savedLayout,
    get places() {
      return places;
    },
    locked: () => locked,
  });

  const appearance = createNodeAppearancePreference();

  const library = createEditorLibrary(blueprint);
  const proposal = $derived(locked ? null : firstProposal(blueprint.links, library.fragmentOf));

  /** The nodes that the dialog saves: read when it opens, so a change of selection does not alter it. */
  let saving = $state<PipelineNodeEntity[] | null>(null);
  const saveNodes = $derived(
    linkable && !locked ? (nodes: PipelineNodeEntity[]) => (saving = nodes) : undefined,
  );
  const saveSelection = $derived(saveNodes && (() => saveNodes(blueprint.selectedNodes)));

  const placeSaved = (fragment: FragmentEntity, replace: boolean) => {
    if (!replace || !saving) return;
    const version = latestVersion(fragment);
    blueprint.replaceWithBlock(
      saving.map(node => node.id),
      { fragment, version, values: valuesOf(saving, version.parameters) },
    );
  };

  const templatesQuery = createQuery(() => nodeTemplateQueries.list());
  const entries = $derived(catalogEntries(templatesQuery.data ?? []));

  const drag = createPaletteDrag();

  const quickAdd = createQuickAdd({
    entries: () => entries,
    resolve: catalogText,
    onPick: (entry, request) =>
      blueprint.inspect(
        blueprint.addNode(entry.nodeId, entry.definition, {
          ...request.link,
          position: nodePositionAt(appearance.current, request.flow),
        }),
      ),
  });
</script>

<!--
  The provider lets the canvas convert screen points to the graph's. The side panel is right of the
  canvas, or under it in a narrow blueprint (`stacked`, measured on the blueprint, not the viewport).
-->
<!-- Paneforge saves the size of the panels in `paneforge:scylla.blueprint.side-panel` (tracker registry). -->
<SvelteFlowProvider>
  <div class="h-full" {@attach width.measure}>
    <ResizablePaneGroup
      direction={stacked ? 'vertical' : 'horizontal'}
      autoSaveId="scylla.blueprint.side-panel"
      onLayoutChange={() => {
        laidOut = true;
      }}
      class={cn('overflow-hidden', !ready && '[&>[data-pane]]:transition-none')}
    >
      <!-- A container: a notice sits beside the toolbar of the canvas only when both fit. -->
      <ResizablePane id="blueprint-canvas" order={1} class="@container relative">
        {#if laidOut}
          <BlueprintCanvas
            {blueprint}
            {appearance}
            {quickAdd}
            {drag}
            {entries}
            {dimmed}
            fragmentOf={library.fragmentOf}
            onAddFragment={(fragment, placement) => library.add(fragment, placement)}
            onReady={() => {
              ready = true;
              onReady?.();
            }}
          />
        {/if}
        {#if notice}
          {@render notice()}
        {:else if blueprint.repeated}
          <p
            role="alert"
            class="absolute inset-x-4 top-4 z-10 rounded-md border border-destructive/40 bg-card px-3 py-2 text-sm text-destructive shadow-xs"
          >
            {t(pipelineMessages.repeatedHint)}
          </p>
        {:else if proposal}
          {@const { blockId, fragment, version } = proposal}
          <UpdateNotice {fragment} {version} onReview={() => blueprint.inspect(blockId)} />
        {/if}
      </ResizablePane>
      <ResizableHandle />
      {#if sidePanel}
        {@render sidePanel()}
      {:else}
        <BlueprintSidePanel
          {blueprint}
          {entries}
          {library}
          {linkable}
          {projectId}
          {drag}
          {stacked}
          onSaveSelection={saveSelection}
          onSaveNode={saveNodes && (node => saveNodes([node]))}
          onAdd={entry => blueprint.inspect(blueprint.addNode(entry.nodeId, entry.definition))}
        />
      {/if}
    </ResizablePaneGroup>
  </div>
  <PaletteDragGhost {drag} />
  {#if saving}
    <SaveFragmentDialog
      open
      onOpenChange={open => {
        if (!open) saving = null;
      }}
      nodes={saving}
      replaceable={!blueprint.portLeaving(saving.map(node => node.id))}
      {library}
      {pipelineName}
      onSaved={placeSaved}
    />
  {/if}
</SvelteFlowProvider>
