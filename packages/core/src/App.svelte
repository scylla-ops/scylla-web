<script lang="ts">
  import { Toaster } from '@scylla/ui/primitives';
  import RouterView from './routing/view/RouterView/RouterView.svelte';
  import { shellConfig } from './shell/shell-config.ts';

  // Over each page, with a frame or not: a public page has no shell.
  const overlays = shellConfig().contributions.flatMap(shell => shell.appOverlays ?? []);
</script>

<RouterView />
{#each overlays as Overlay, index (index)}
  <Overlay />
{/each}
<Toaster />
