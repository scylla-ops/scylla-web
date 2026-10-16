<script lang="ts">
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import {
    BaseEdge,
    EdgeLabel,
    getBezierPath,
    useSvelteFlow,
    type EdgeProps,
  } from '@xyflow/svelte';
  import { t } from '@scylla/ui/i18n';
  import { EDGE_COLOR } from '../../../utils/blueprint-converter.ts';
  import { pipelineMessages } from '../../../pipeline.messages.ts';

  const SELECTED_COLOR = 'var(--destructive)';

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

  const path = $derived(
    getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition }),
  );
  const color = $derived(selected ? SELECTED_COLOR : EDGE_COLOR);
</script>

<!-- A dependency, with a delete button once selected. -->
<BaseEdge
  {id}
  path={path[0]}
  {markerEnd}
  style="stroke: {color}; stroke-width: {selected ? 2.5 : 1.5};"
/>

{#if selected}
  <EdgeLabel x={path[1]} y={path[2]} transparent class="nodrag nopan" style="pointer-events: all; z-index: 1000;">
    <button
      type="button"
      aria-label={t(pipelineMessages.deleteEdge)}
      class="flex size-7 cursor-pointer items-center justify-center rounded-full border-2 border-background bg-destructive text-white shadow-md transition-transform hover:scale-110"
      onclick={event => {
        event.stopPropagation();
        event.preventDefault();
        void deleteElements({ edges: [{ id }] });
      }}
      onmousedown={event => event.stopPropagation()}
    >
      <Trash2Icon class="size-3.5" />
    </button>
  </EdgeLabel>
{/if}
