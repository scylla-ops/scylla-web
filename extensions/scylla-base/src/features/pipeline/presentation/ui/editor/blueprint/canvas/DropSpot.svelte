<script lang="ts">
  import { ViewportPortal, type XYPosition } from '@xyflow/svelte';
  import type { NodeFootprint } from './nodes/node-geometry.ts';

  interface Props {
    /** The position of the node that a drop creates, in the graph. */
    position: XYPosition;
    footprint: NodeFootprint;
  }

  let { position, footprint }: Props = $props();
</script>

<!--
  The place of the node a drop creates: in the graph, so it follows the zoom, and in front of
  the nodes, so nothing hides it. No transition on the move: the browser reports a drag about
  every 50 ms, and a transition would lag behind it.
-->
<ViewportPortal target="front">
  <div
    aria-hidden="true"
    class="pointer-events-none absolute top-0 left-0 will-change-transform"
    style:transform="translate({position.x + footprint.x}px, {position.y + footprint.y}px)"
  >
    <div
      class="animate-in border-2 border-dashed border-primary bg-primary/12 shadow-[0_0_0_4px] shadow-primary/15 duration-150 fade-in-0 zoom-in-95"
      style:width="{footprint.width}px"
      style:height="{footprint.height}px"
      style:border-radius="{footprint.radius}px"
    >
      <div class="size-full animate-pulse rounded-[inherit] bg-primary/10"></div>
    </div>
  </div>
</ViewportPortal>
