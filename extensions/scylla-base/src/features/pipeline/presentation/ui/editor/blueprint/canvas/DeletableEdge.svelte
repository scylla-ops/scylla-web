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
  import { cn } from '@scylla/ui/utils';
  import { pipelineMessages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';
  import { EDGE_COLOR } from '@base/features/pipeline/presentation/mappers/blueprint-flow.mapper.ts';
  import { getBlueprintCanvas } from './blueprint-canvas.context.ts';
  import { blueprintMessages } from '@base/features/pipeline/presentation/messages/blueprint.messages.ts';
  import { ERROR_PORT } from '@base/features/pipeline/domain/structs/port-name.struct.ts';

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
    sourceHandleId,
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
  /** An edge from the error output is red. */
  const color = $derived(sourceHandleId === ERROR_PORT ? 'var(--destructive)' : EDGE_COLOR);
</script>

<!--
  A dependency, with the name of its port. Once selected, it offers to insert a node in its middle,
  or to go.
-->
<BaseEdge
  {id}
  path={path[0]}
  {markerEnd}
  interactionWidth={24}
  style="stroke: {selected ? 'var(--primary)' : color}; stroke-width: {selected
    ? 2
    : 1.5}; stroke-linecap: round;"
/>

{#if sourceHandleId && !selected}
  <EdgeLabel x={path[1]} y={path[2]} transparent class="nodrag nopan">
    <span
      class={cn(
        'rounded-full border bg-card px-1.5 py-px font-mono text-[10.5px]',
        sourceHandleId === ERROR_PORT
          ? 'border-destructive/50 text-destructive'
          : 'text-muted-foreground',
      )}
    >
      {sourceHandleId}
    </span>
  </EdgeLabel>
{/if}

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
