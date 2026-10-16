<script lang="ts">
  import { SvelteFlowProvider } from '@xyflow/svelte';
  import { createQuery } from '@scylla/core-sdk';
  import type { PipelineStep } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
  import { createBlueprintState } from '@base/features/pipeline/presentation/blueprint.state.svelte.ts';
  import { createNodeAppearance } from '@base/features/pipeline/presentation/node-appearance.svelte.ts';
  import { stepTemplateQueries } from '@base/features/pipeline/presentation/pipeline.queries.ts';
  import { createQuickAdd } from '@base/features/pipeline/presentation/quick-add.state.svelte.ts';
  import BlueprintCanvas from './BlueprintCanvas.svelte';
  import { catalogEntries, catalogText } from './catalog.ts';
  import { nodePositionAt } from './nodes/node-appearances.ts';
  import BlueprintSidePanel from './side-panel/BlueprintSidePanel.svelte';

  interface Props {
    steps: PipelineStep[];
    pipelineName: string;
    projectId?: string;
    onStepsChange: (steps: PipelineStep[]) => void;
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
  <div class="flex h-full w-full overflow-hidden">
    <BlueprintCanvas {blueprint} {appearance} {quickAdd} {entries} />
    <BlueprintSidePanel
      {blueprint}
      {entries}
      {projectId}
      onAdd={entry => blueprint.inspect(blueprint.addNode(entry.nodeId, entry.definition))}
    />
  </div>
</SvelteFlowProvider>
