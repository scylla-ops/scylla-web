<script lang="ts">
  import { SvelteFlowProvider } from '@xyflow/svelte';
  import { createQuery } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import { ResizableHandle, ResizablePane, ResizablePaneGroup } from '@scylla/ui/primitives';
  import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
  import { createBlueprint } from './blueprint.state.svelte.ts';
  import { createNodeAppearancePreference } from './canvas/node-appearance-preference.state.svelte.ts';
  import { nodeTemplateQueries } from '@base/features/pipeline/presentation/pipeline.queries.ts';
  import { createQuickAdd } from '@base/features/pipeline/presentation/ui/editor/blueprint/catalog/QuickAddMenu/quick-add.state.svelte.ts';
  import BlueprintCanvas from './canvas/BlueprintCanvas.svelte';
  import {
    catalogEntries,
    catalogText,
  } from '@base/features/pipeline/presentation/presenters/catalog.presenter.ts';
  import PaletteDragGhost from './palette-drag/PaletteDragGhost.svelte';
  import { createPaletteDrag } from './palette-drag/palette-drag.state.svelte.ts';
  import { nodePositionAt } from './canvas/nodes/node-appearances.registry.ts';
  import BlueprintSidePanel from './side-panel/BlueprintSidePanel.svelte';
  import { pipelineMessages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';

  interface Props {
    nodes: PipelineNodeEntity[];
    pipelineName: string;
    projectId?: string;
    onNodesChange: (nodes: PipelineNodeEntity[]) => void;
  }

  let { nodes, pipelineName, projectId, onNodesChange }: Props = $props();

  const blueprint = createBlueprint({
    nodes: () => nodes,
    pipelineName: () => pipelineName,
    // Read at call time, so a swapped callback is the one called.
    onNodesChange: next => onNodesChange(next),
  });

  const appearance = createNodeAppearancePreference();

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

<!-- The provider lets the canvas convert screen points to the graph's. -->
<SvelteFlowProvider>
  <ResizablePaneGroup
    direction="horizontal"
    autoSaveId="scylla.blueprint.side-panel"
    class="overflow-hidden"
  >
    <ResizablePane id="blueprint-canvas" order={1} class="relative">
      <BlueprintCanvas {blueprint} {appearance} {quickAdd} {drag} {entries} />
      {#if blueprint.readOnly}
        <p
          role="alert"
          class="absolute inset-x-4 top-4 z-10 rounded-md border border-destructive/40 bg-card px-3 py-2 text-sm text-destructive shadow-xs"
        >
          {t(pipelineMessages.repeatedHint)}
        </p>
      {/if}
    </ResizablePane>
    <ResizableHandle />
    <BlueprintSidePanel
      {blueprint}
      {entries}
      {projectId}
      {drag}
      onAdd={entry => blueprint.inspect(blueprint.addNode(entry.nodeId, entry.definition))}
    />
  </ResizablePaneGroup>
  <PaletteDragGhost {drag} />
</SvelteFlowProvider>
