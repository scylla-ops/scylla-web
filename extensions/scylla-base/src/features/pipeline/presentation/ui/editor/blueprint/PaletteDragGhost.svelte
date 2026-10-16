<script lang="ts">
  import { Portal } from '@scylla/ui/primitives';
  import CatalogItem from './CatalogItem.svelte';
  import type { PaletteDrag } from './palette-drag.state.svelte.ts';

  interface Props {
    drag: PaletteDrag;
  }

  let { drag }: Props = $props();
</script>

<!-- The dragged step, under the pointer until it reaches the canvas, which then draws it. -->
{#if drag.ghost}
  <Portal>
    <div
      aria-hidden="true"
      class="pointer-events-none fixed z-50 flex w-60 items-center gap-2.5 rounded-[10px] border bg-card p-2 shadow-lg ring-[3px] ring-primary/15"
      style:left="{drag.ghost.client.x + 12}px"
      style:top="{drag.ghost.client.y + 12}px"
    >
      <CatalogItem entry={drag.ghost.entry} />
    </div>
  </Portal>
{/if}
