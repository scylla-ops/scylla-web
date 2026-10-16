<script lang="ts">
  import PlusIcon from '@lucide/svelte/icons/plus';
  import {
    Background,
    BackgroundVariant,
    Controls,
    SvelteFlow,
    useSvelteFlow,
    type EdgeTypes,
    type NodeTypes,
  } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { Button } from '@scylla/ui/shadcn';
  import { t } from '@scylla/ui/i18n';
  import type { BlueprintState } from '../../../blueprint.state.svelte.ts';
  import {
    acceptStepDrop,
    keepInView,
    type KeepInViewParams,
    type StepDrop,
  } from '../../../blueprint-canvas.actions.ts';
  import {
    DEFAULT_EDGE_STYLE,
    NODE_HEIGHT,
    NODE_WIDTH,
    START_NODE_ID,
  } from '../../../utils/blueprint-converter.ts';
  import DeletableEdge from './DeletableEdge.svelte';
  import PipelineStepNode from './PipelineStepNode.svelte';
  import StartNode from './StartNode.svelte';
  import { blueprintMessages } from './blueprint.messages.ts';
  import { STEP_BLOCKS, stepBlockOf } from './step-blocks.ts';

  interface Props {
    blueprint: BlueprintState;
  }

  let { blueprint }: Props = $props();

  const nodeTypes: NodeTypes = { pipelineStep: PipelineStepNode, startNode: StartNode };
  const edgeTypes: EdgeTypes = { deletable: DeletableEdge };

  const { flowToScreenPosition, getZoom, screenToFlowPosition, setCenter } = useSvelteFlow();

  const isEmpty = $derived(blueprint.nodes.every(node => node.id === START_NODE_ID));

  const handleDrop = ({ blockKey, clientX, clientY, afterId }: StepDrop) => {
    const block = stepBlockOf(blockKey);
    if (!block) return;
    if (afterId) {
      // Dropped on a step: placed beside it, not on top of it.
      blueprint.addStep(block.idPrefix, block.value(), { after: afterId });
      return;
    }
    const point = screenToFlowPosition({ x: clientX, y: clientY });
    // The pointer holds the middle of the new node, not its corner.
    const position = { x: point.x - NODE_WIDTH / 2, y: point.y - NODE_HEIGHT / 2 };
    blueprint.addStep(block.idPrefix, block.value(), { position });
  };

  const inView = $derived.by((): KeepInViewParams => {
    const node = blueprint.nodes.find(candidate => candidate.id === blueprint.selectedId);
    return {
      target: node
        ? {
            id: node.id,
            ...node.position,
            width: node.measured?.width ?? NODE_WIDTH,
            height: node.measured?.height ?? NODE_HEIGHT,
          }
        : null,
      flowToScreen: flowToScreenPosition,
      center: (x, y) => void setCenter(x, y, { zoom: getZoom(), duration: 200 }),
    };
  });

  // The shortcut of the empty canvas: the most common first step.
  const [bashBlock] = STEP_BLOCKS;
</script>

<div
  class="relative h-full min-w-0 flex-1"
  use:acceptStepDrop={{ onDrop: handleDrop }}
  use:keepInView={inView}
>
  <!-- `nodes` and `edges` are bound: the library drags, selects and deletes; the callbacks report the changes. -->
  <SvelteFlow
    bind:nodes={blueprint.nodes}
    bind:edges={blueprint.edges}
    {nodeTypes}
    {edgeTypes}
    fitView
    fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
    deleteKey={['Backspace', 'Delete']}
    edgesFocusable
    defaultEdgeOptions={DEFAULT_EDGE_STYLE}
    onbeforeconnect={connection => (blueprint.canConnect(connection) ? connection : false)}
    onconnect={() => blueprint.sync()}
    ondelete={() => blueprint.sync()}
    onnodeclick={({ node }) => blueprint.select(node.id)}
    onpaneclick={() => blueprint.select(null)}
  >
    <Background variant={BackgroundVariant.Dots} gap={16} size={1} class="bg-background!" />
    <Controls showLock={false} class="border-border! bg-card! shadow-sm!" />
  </SvelteFlow>

  {#if isEmpty}
    <!-- Below the middle, where `fitView` puts the start node. -->
    <div class="pointer-events-none absolute inset-x-0 top-1/2 mt-16 flex justify-center">
      <div
        class="pointer-events-auto flex w-96 flex-col items-center gap-2.5 rounded-2xl border-2 border-dashed border-border bg-background px-6 py-8 text-center"
      >
        <span class="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
          <PlusIcon class="size-5" />
        </span>
        <p class="text-[15px] font-semibold">{t(blueprintMessages.emptyCanvasTitle)}</p>
        <p class="max-w-72 text-[13px] leading-relaxed text-muted-foreground">
          {t(blueprintMessages.emptyCanvasBody)}
        </p>
        <Button
          variant="outline"
          size="sm"
          onclick={() => blueprint.addStep(bashBlock.idPrefix, bashBlock.value())}
        >
          {t(blueprintMessages.addBashScript)}
        </Button>
      </div>
    </div>
  {:else if blueprint.selectedId === null}
    <p class="pointer-events-none absolute right-4 bottom-5 text-xs text-muted-foreground">
      {t(blueprintMessages.canvasHint)}
    </p>
  {/if}
</div>

<style>
  :global(.svelte-flow__controls-button) {
    --xy-controls-button-background-color: var(--card);
    --xy-controls-button-background-color-hover: var(--muted);
    --xy-controls-button-color: var(--foreground);
    --xy-controls-button-color-hover: var(--foreground);
    --xy-controls-button-border-color: var(--border);
  }
</style>
