<script lang="ts">
  import PlusIcon from '@lucide/svelte/icons/plus';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import {
    BaseEdge,
    EdgeLabel,
    getSmoothStepPath,
    useSvelteFlow,
    type EdgeProps,
  } from '@xyflow/svelte';
  import { t } from '@scylla/ui/i18n';
  import { pipelineMessages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';
  import { EDGE_COLOR } from '@base/features/pipeline/presentation/mappers/blueprint-flow.mapper.ts';
  import { getBlueprintCanvas } from './blueprint-canvas.context.ts';
  import { blueprintMessages } from '@base/features/pipeline/presentation/messages/blueprint.messages.ts';

  let {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    selected,
    markerEnd,
  }: EdgeProps = $props();

  const { deleteElements } = useSvelteFlow();
  const canvas = getBlueprintCanvas();

  const path = $derived(
    getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      borderRadius: 14,
    }),
  );
</script>

<!-- A dependency. Once selected, it offers to insert a node in its middle, or to go. -->
<BaseEdge
  {id}
  path={path[0]}
  {markerEnd}
  interactionWidth={24}
  style="stroke: {selected ? 'var(--primary)' : EDGE_COLOR}; stroke-width: {selected
    ? 2
    : 1.5}; stroke-linecap: round;"
/>

{#if selected}
  <EdgeLabel x={path[1]} y={path[2]} transparent class="nodrag nopan" style="pointer-events: all;">
    <div class="flex gap-0.5 rounded-full border bg-card p-0.5 shadow-sm">
      <button
        type="button"
        aria-label={t(blueprintMessages.insertNode)}
        class="flex size-6 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary-subtle"
        onclick={event => {
          event.stopPropagation();
          canvas.insertOnEdge(id, {
            flow: { x: path[1], y: path[2] },
            client: { x: event.clientX, y: event.clientY },
          });
        }}
      >
        <PlusIcon class="size-3.5" />
      </button>
      <button
        type="button"
        aria-label={t(pipelineMessages.deleteEdge)}
        class="flex size-6 items-center justify-center rounded-full text-destructive transition-colors hover:bg-destructive-subtle"
        onclick={event => {
          event.stopPropagation();
          void deleteElements({ edges: [{ id }] });
        }}
      >
        <Trash2Icon class="size-3.5" />
      </button>
    </div>
  </EdgeLabel>
{/if}
