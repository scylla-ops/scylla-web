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

<!-- The place of the node a drop creates: in the graph, so it follows the zoom. -->
<ViewportPortal target="back">
  <div
    aria-hidden="true"
    class="pointer-events-none absolute top-0 left-0 transition-transform duration-75 ease-out"
    style:transform="translate({position.x + footprint.x}px, {position.y + footprint.y}px)"
  >
    <div
      class="animate-in border-2 border-dashed border-primary/60 bg-primary/8 duration-150 fade-in-0 zoom-in-95"
      style:width="{footprint.width}px"
      style:height="{footprint.height}px"
      style:border-radius="{footprint.radius}px"
    >
      <div class="size-full animate-pulse rounded-[inherit] bg-primary/6"></div>
    </div>
  </div>
</ViewportPortal>
