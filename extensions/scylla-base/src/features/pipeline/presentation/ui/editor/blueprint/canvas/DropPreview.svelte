<script lang="ts">
  import { Position, ViewportPortal, getSmoothStepPath } from '@xyflow/svelte';
  import type { PreviewEdge } from '@base/features/pipeline/presentation/presenters/smart-drop.presenter.ts';

  interface Props {
    /** The edges that a drop makes, in graph points. */
    edges: readonly PreviewEdge[];
  }

  let { edges }: Props = $props();

  const pathOf = ({ from, to }: PreviewEdge) =>
    getSmoothStepPath({
      sourceX: from.x,
      sourceY: from.y,
      targetX: to.x,
      targetY: to.y,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      borderRadius: 14,
    })[0];
</script>

<!-- The connection of a drop, dashed: what the drop does is what this shows. In front of the nodes. -->
<ViewportPortal target="front">
  <svg aria-hidden="true" class="pointer-events-none absolute top-0 left-0 size-px overflow-visible">
    {#each edges as edge, index (index)}
      <path
        d={pathOf(edge)}
        fill="none"
        class="stroke-primary"
        stroke-width="2"
        stroke-dasharray="6 4"
        stroke-linecap="round"
      />
    {/each}
  </svg>
</ViewportPortal>
