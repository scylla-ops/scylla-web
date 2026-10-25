<script lang="ts">
  import { SvelteFlowProvider } from '@xyflow/svelte';
  import { createQuery } from '@scylla/core-sdk';
  import { ResizableHandle, ResizablePane, ResizablePaneGroup } from '@scylla/ui/primitives';
  import type { PipelineStepEntity } from '@base/features/pipeline/domain/entities/pipeline-step.entity.ts';
  import { createBlueprintState } from './blueprint.state.svelte.ts';
  import { createNodeAppearance } from './canvas/node-appearance-preference.state.svelte.ts';
  import { stepTemplateQueries } from '@base/features/pipeline/presentation/pipeline.queries.ts';
  import { createQuickAdd } from '@base/features/pipeline/presentation/ui/editor/blueprint/catalog/QuickAddMenu/quick-add.state.svelte.ts';
  import BlueprintCanvas from './canvas/BlueprintCanvas.svelte';
  import { catalogEntries, catalogText } from '@base/features/pipeline/presentation/presenters/catalog.presenter.ts';
  import PaletteDragGhost from './palette-drag/PaletteDragGhost.svelte';
  import { createPaletteDrag } from './palette-drag/palette-drag.state.svelte.ts';
  import { nodePositionAt } from './canvas/nodes/node-appearances.registry.ts';
  import BlueprintSidePanel from './side-panel/BlueprintSidePanel.svelte';

  interface Props {
    steps: PipelineStepEntity[];
    pipelineName: string;
    projectId?: string;
    onStepsChange: (steps: PipelineStepEntity[]) => void;
  }

  let { steps, pipelineName, projectId, onStepsChange }: Props = $props();

  const blueprint = createBlueprintState({
    steps: () => steps,
    pipelineName: () => pipelineName,
    // Read at call time, so a swapped callback is the one called.
    onStepsChange: next => onStepsChange(next),
  });

  const appearance = createNodeAppearance();

  const templatesQuery = createQuery(() => stepTemplateQueries.list());
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
    <ResizablePane id="blueprint-canvas" order={1}>
      <BlueprintCanvas {blueprint} {appearance} {quickAdd} {drag} {entries} />
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
