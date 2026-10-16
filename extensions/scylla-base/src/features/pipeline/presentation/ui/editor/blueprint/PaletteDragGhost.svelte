<script lang="ts">
  import { Portal } from '@scylla/ui/primitives';
  import CatalogIcon from './CatalogIcon.svelte';
  import type { PaletteDrag } from './palette-drag.state.svelte.ts';

  interface Props {
    drag: PaletteDrag;
  }

  let { drag }: Props = $props();
</script>

<!--
  The pointer of a palette drag: the pointer itself is hidden, and the icon is centred on its
  point. Over the canvas, it sits where the icon of the dropped node lands, inside the outline.
-->
{#if drag.entry && drag.pointer}
  <Portal>
    <div
      aria-hidden="true"
      class="pointer-events-none fixed top-0 left-0 z-50 will-change-transform"
      style:transform="translate({drag.pointer.x}px, {drag.pointer.y}px) translate(-50%, -50%)"
    >
      <CatalogIcon
        entry={drag.entry}
        class="animate-in shadow-lg ring-[3px] ring-primary/25 duration-100 zoom-in-90"
      />
    </div>
  </Portal>
{/if}
