<script lang="ts">
  import { cubicOut } from 'svelte/easing';
  import { fade } from 'svelte/transition';
  import { motionDuration } from '@scylla/ui';
  import type { CanvasCurtain } from './canvas-curtain.state.svelte.ts';
  import CanvasLoadError from './CanvasLoadError.svelte';
  import CanvasLoader from './CanvasLoader.svelte';

  interface Props {
    curtain: CanvasCurtain;
    onRetry: () => void;
  }

  let { curtain, onRetry }: Props = $props();
</script>

<!--
  Covers the canvas and the side panel with the look of an empty canvas until the graph is fitted:
  the view never moves under the eyes of the user. The graph fades in as the curtain fades out. The
  pointer goes through it to the editor, which is inert until then.
-->
{#if !curtain.revealed}
  <div
    data-slot="canvas-curtain"
    class="curtain pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background"
    out:fade={{ duration: motionDuration(200), easing: cubicOut }}
  >
    {#if curtain.failed}
      <CanvasLoadError {onRetry} />
    {:else if curtain.phase !== 'waiting'}
      <CanvasLoader leaving={curtain.phase === 'leaving'} slow={curtain.slow} />
    {/if}
  </div>
{/if}

<style>
  /* The dots of the canvas background: gap 16, size 1, the colour of Svelte Flow. */
  .curtain {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Ccircle cx='8' cy='8' r='0.5' fill='%2391919a'/%3E%3C/svg%3E");
  }
</style>
