<script lang="ts">
  import {
    Controls,
    SvelteFlow,
    useSvelteFlow,
    type Edge,
    type FitViewOptions,
    type NodeTypes,
  } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { keepFitted } from '@scylla/ui';
  import type { JobFlowNode } from '@base/features/jobs/presentation/presenters/job-graph.presenter.ts';
  import JobGraphNode from './JobGraphNode.svelte';

  interface Props {
    nodes: JobFlowNode[];
    edges: Edge[];
  }

  let { nodes, edges }: Props = $props();

  const nodeTypes: NodeTypes = { jobNode: JobGraphNode };
  // A pipeline of 256 nodes fits too: the view may zoom far out.
  const FIT_VIEW_OPTIONS: FitViewOptions = { padding: 0.15, maxZoom: 1, minZoom: 0.01 };

  const { fitView } = useSvelteFlow();

  /** The view frames the graph until the user pans or zooms; the fit button frames it again. */
  let fitted = $state(true);

  const onControlsClick = (event: MouseEvent) => {
    const button = (event.target as Element).closest('button');
    if (button) fitted = button.classList.contains('svelte-flow__controls-fitview');
  };
</script>

<!-- Nothing moves, links or goes: a click on a node opens its logs, the view pans and zooms. -->
<div
  class="graph h-full w-full"
  {@attach keepFitted(() => ({ fitted, fit: () => void fitView(FIT_VIEW_OPTIONS) }))}
>
  <SvelteFlow
    {nodes}
    {edges}
    {nodeTypes}
    fitView
    fitViewOptions={FIT_VIEW_OPTIONS}
    minZoom={0.01}
    nodesDraggable={false}
    nodesConnectable={false}
    elementsSelectable={false}
    deleteKey={null}
    selectionKey={null}
    multiSelectionKey={null}
    zoomOnDoubleClick={false}
    onmove={event => {
      // A move with no event is the code's own, such as a fit.
      if (event) fitted = false;
    }}
  >
    <Controls
      showLock={false}
      fitViewOptions={FIT_VIEW_OPTIONS}
      onclick={onControlsClick}
      class="overflow-hidden rounded-[10px]! border! border-border! shadow-xs!"
    />
  </SvelteFlow>
</div>

<style>
  /* The colours of the theme, as the canvas of the editor has them. */
  .graph :global(.svelte-flow__controls-button) {
    --xy-controls-button-background-color: var(--card);
    --xy-controls-button-background-color-hover: var(--muted);
    --xy-controls-button-color: var(--foreground);
    --xy-controls-button-color-hover: var(--foreground);
    --xy-controls-button-border-color: var(--border);
  }

  .graph :global(.svelte-flow__attribution) {
    background: transparent;
  }
</style>
