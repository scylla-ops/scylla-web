<script lang="ts">
  import {
    Background,
    BackgroundVariant,
    Controls,
    SvelteFlow,
    useConnection,
    useSvelteFlow,
    type EdgeTypes,
    type NodeTypes,
    type OnConnectEnd,
    type XYPosition,
  } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { t } from '@scylla/ui/i18n';
  import type { Blueprint } from '../blueprint.state.svelte.ts';
  import type { NodeAppearancePreference } from './node-appearance-preference.state.svelte.ts';
  import type { QuickAdd } from '@base/features/pipeline/presentation/ui/editor/blueprint/catalog/QuickAddMenu/quick-add.state.svelte.ts';
  import { DEFAULT_EDGE_STYLE } from '@base/features/pipeline/presentation/mappers/blueprint-flow.mapper.ts';
  import { templateFor, type CatalogEntry } from '@base/features/pipeline/presentation/presenters/catalog.presenter.ts';
  import { pipelineMessages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';
  import { setBlueprintCanvas } from './blueprint-canvas.context.ts';
  import CanvasToolbar from './CanvasToolbar.svelte';
  import DeletableEdge from './DeletableEdge.svelte';
  import { linkDropPoint } from '@base/features/pipeline/presentation/presenters/blueprint-geometry.presenter.ts';
  import DropSpot from './DropSpot.svelte';
  import { acceptPaletteDrop } from '../palette-drag/palette-drag.attachments.ts';
  import type { PaletteDrag } from '../palette-drag/palette-drag.state.svelte.ts';
  import { NODE_APPEARANCE_VIEWS, nodePositionAt } from './nodes/node-appearances.registry.ts';
  import StartNode from './nodes/StartNode.svelte';
  import StepNode from './nodes/StepNode.svelte';
  import QuickAddMenu from '../catalog/QuickAddMenu/QuickAddMenu.svelte';

  interface Props {
    blueprint: Blueprint;
    appearance: NodeAppearancePreference;
    quickAdd: QuickAdd;
    drag: PaletteDrag;
    entries: readonly CatalogEntry[];
  }

  let { blueprint, appearance, quickAdd, drag, entries }: Props = $props();

  const nodeTypes: NodeTypes = { pipelineStep: StepNode, startNode: StartNode };
  const edgeTypes: EdgeTypes = { deletable: DeletableEdge };

  const { screenToFlowPosition } = useSvelteFlow();

  setBlueprintCanvas({
    appearance: () => appearance.current,
    isDetached: stepId => blueprint.isDetached(stepId),
    iconHintOf: definition => templateFor(entries, definition)?.icon,
    insertOnEdge: (edgeId, at) => quickAdd.open({ ...at, link: { replacing: edgeId } }),
  });

  const clientPoint = (event: MouseEvent | TouchEvent): XYPosition => {
    const point = 'changedTouches' in event ? event.changedTouches[0] : event;
    return { x: point.clientX, y: point.clientY };
  };

  /** A link dropped on empty canvas asks which step to create there. */
  const onConnectEnd: OnConnectEnd = (event, connection) => {
    const from = connection.fromNode;
    const droppedOnEmpty = !connection.isValid && !connection.toNode;
    if (!from || !droppedOnEmpty || connection.fromHandle?.type !== 'source') return;

    const client = clientPoint(event);
    quickAdd.open({ client, flow: screenToFlowPosition(client), link: { after: from.id } });
  };

  const connection = useConnection();

  /** The place of the step that a drop creates: a palette entry, or a link pulled onto empty canvas. */
  const spot = $derived.by(() => {
    if (drag.spot) return drag.spot;
    const point = linkDropPoint(connection.current);
    return point && nodePositionAt(appearance.current, point);
  });
</script>

<div
  role="application"
  aria-label={t(pipelineMessages.blueprint)}
  class="relative h-full min-w-0 flex-1"
  {@attach acceptPaletteDrop(() => ({
    drag,
    // The middle of the node lands on the pointer: the dragged icon is in the middle of the outline.
    positionAt: client => nodePositionAt(appearance.current, screenToFlowPosition(client)),
    drop: (entry, position) => blueprint.addNode(entry.stepId, entry.definition, { position }),
  }))}
>
  <!--
    `nodes` and `edges` are bound: the library drags, selects and deletes; the callbacks report the
    changes. Only a click opens the side panel: a drag neither selects nor opens.
  -->
  <SvelteFlow
    bind:nodes={blueprint.nodes}
    bind:edges={blueprint.edges}
    {nodeTypes}
    {edgeTypes}
    fitView
    fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
    deleteKey={['Backspace', 'Delete']}
    selectNodesOnDrag={false}
    edgesFocusable
    defaultEdgeOptions={DEFAULT_EDGE_STYLE}
    onbeforeconnect={connection => (blueprint.canConnect(connection) ? connection : false)}
    onconnect={() => blueprint.sync()}
    onconnectend={onConnectEnd}
    ondelete={() => blueprint.sync()}
    onnodeclick={({ node }) => blueprint.inspect(node.id)}
    onpaneclick={() => blueprint.inspect(null)}
  >
    <Background variant={BackgroundVariant.Dots} gap={16} size={1} class="bg-background!" />
    <Controls
      showLock={false}
      class="overflow-hidden rounded-[10px]! border! border-border! shadow-xs!"
    />
    <CanvasToolbar
      appearance={appearance.current}
      onAppearanceChange={next => appearance.set(next)}
      onArrange={() => blueprint.arrange()}
    />
    {#if spot}
      <DropSpot
        position={spot}
        footprint={NODE_APPEARANCE_VIEWS[appearance.current].footprint}
      />
    {/if}
  </SvelteFlow>

  <QuickAddMenu {quickAdd} />
</div>

<style>
  :global(.svelte-flow__controls-button) {
    --xy-controls-button-background-color: var(--card);
    --xy-controls-button-background-color-hover: var(--muted);
    --xy-controls-button-color: var(--foreground);
    --xy-controls-button-color-hover: var(--foreground);
    --xy-controls-button-border-color: var(--border);
  }

  :global(.svelte-flow__attribution) {
    background: transparent;
  }

  :global(.svelte-flow__edge:not(.selected):hover .svelte-flow__edge-path) {
    stroke: var(--muted-foreground) !important;
  }
</style>
