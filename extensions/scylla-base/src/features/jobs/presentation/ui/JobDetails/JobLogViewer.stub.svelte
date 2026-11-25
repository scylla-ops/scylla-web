<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    nodeId: string | null;
    title: string;
    isLive: boolean;
    fullscreen: boolean;
    onFullscreenChange: (fullscreen: boolean) => void;
    fileName: string;
    note?: Snippet;
    unavailable?: string;
  }

  let { nodeId, title, isLive, fullscreen, onFullscreenChange, fileName, note, unavailable }: Props =
    $props();
</script>

<!-- The viewer reduced to what the job page decides. A component: `vi.mock` of a `.svelte` needs one. -->
<section data-testid="job-log-viewer" aria-label={title} data-live={isLive} data-file={fileName}>
  <p data-testid="job-log-node">{nodeId ?? 'whole job'}</p>
  {@render note?.()}
  {#if unavailable}
    <p>{unavailable}</p>
  {/if}
  <button type="button" onclick={() => onFullscreenChange(!fullscreen)}>
    {fullscreen ? 'Exit full screen' : 'Full screen'}
  </button>
</section>
