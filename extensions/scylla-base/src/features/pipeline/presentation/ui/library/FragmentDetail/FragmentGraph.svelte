<script lang="ts">
  import {
    Background,
    BackgroundVariant,
    Controls,
    SvelteFlow,
    type NodeTypes,
    type OnConnectEnd,
    type XYPosition,
  } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import '@base/features/pipeline/presentation/ui/editor/blueprint/canvas/flow-theme.css';
  import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
  import {
    DEFAULT_EDGE_STYLE,
    nodesToFlow,
    START_NODE_ID,
  } from '@base/features/pipeline/presentation/mappers/blueprint-flow.mapper.ts';
  import { setBlueprintCanvas } from '@base/features/pipeline/presentation/ui/editor/blueprint/canvas/blueprint-canvas.context.ts';
  import PipelineNode from '@base/features/pipeline/presentation/ui/editor/blueprint/canvas/nodes/PipelineNode.svelte';

  interface Props {
    nodes: PipelineNodeEntity[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    /** A link pulled from a port and dropped on empty canvas: the new node goes after this port. */
    onPull?: (after: { node: string; port?: string }, client: XYPosition) => void;
  }

  let { nodes, selectedId, onSelect, onPull }: Props = $props();

  // Only a drop on empty canvas counts: the links between the nodes come from their needs.
  const onConnectEnd: OnConnectEnd = (event, connection) => {
    const from = connection.fromNode;
    if (!from || connection.toNode || connection.fromHandle?.type !== 'source') return;
    const point = 'changedTouches' in event ? event.changedTouches[0] : event;
    onPull?.(
      { node: from.id, port: connection.fromHandle.id ?? undefined },
      { x: point.clientX, y: point.clientY },
    );
  };

  const nodeTypes: NodeTypes = { pipelineNode: PipelineNode };
  const FIT_VIEW_OPTIONS = { padding: 0.08, maxZoom: 1 };

  // The nodes of the editor: nothing is detached, and an edge takes no new node.
  setBlueprintCanvas({
    appearance: () => 'detailed',
    isDetached: () => false,
    issueOf: () => null,
    hasErrorPort: nodeId => nodes.some(node => node.deps.some(dep => dep.node === nodeId && dep.port === 'error')),
    iconHintOf: () => undefined,
    insertOnEdge: () => {},
    fragmentOf: () => undefined,
    pipelineId: () => undefined,
  });

  // A fragment has no start node: its first nodes have no edge in.
  const flow = $derived.by(() => {
    const { flowNodes, edges } = nodesToFlow(nodes, '');
    return {
      nodes: flowNodes
        .filter(node => node.id !== START_NODE_ID)
        .map(node => ({ ...node, selected: node.id === selectedId })),
      edges: edges
        .filter(edge => edge.source !== START_NODE_ID)
        .map(edge => ({ ...edge, type: 'default' })),
    };
  });
</script>

<div class="graph h-full min-w-0 flex-1">
  <!-- A node added or removed draws the graph again, fitted: the new node is in view. -->
  {#key nodes.length}
    <SvelteFlow
      nodes={flow.nodes}
      edges={flow.edges}
      {nodeTypes}
      fitView
      fitViewOptions={FIT_VIEW_OPTIONS}
      nodesDraggable={false}
      nodesConnectable={!!onPull}
      clickConnect={false}
      onbeforeconnect={() => false}
      onconnectend={onConnectEnd}
      edgesFocusable={false}
      deleteKey={null}
      defaultEdgeOptions={DEFAULT_EDGE_STYLE}
      onnodeclick={({ node }) => onSelect(node.id)}
      onpaneclick={() => onSelect(null)}
    >
      <Background variant={BackgroundVariant.Dots} gap={16} size={1} class="bg-background!" />
      <Controls
        showLock={false}
        fitViewOptions={FIT_VIEW_OPTIONS}
        class="overflow-hidden rounded-[10px]! border! border-border! shadow-xs!"
      />
    </SvelteFlow>
  {/key}
</div>

<style>
  .graph :global(.svelte-flow__pane) {
    cursor: default;
  }

  .graph :global(.svelte-flow__node) {
    cursor: pointer;
  }
</style>
