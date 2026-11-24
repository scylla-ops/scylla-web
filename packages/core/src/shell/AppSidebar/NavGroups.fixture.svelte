<script lang="ts">
  import { routePathname } from '@scylla/core-sdk';
  import type { ShellConfig } from '../shell-config.ts';
  import { openNavGroupsOnArrival } from './nav-groups.state.svelte.ts';
  import { reactiveNavSections } from './nav-sections.svelte.ts';
  import NavMain from './NavMain.svelte';

  // The folding list of the sheet, always on screen: a test need not open the sheet each time.
  let { config }: { config: ShellConfig } = $props();

  const ready = $derived(config.access?.ready() ?? true);
  const navSections = reactiveNavSections(() => config);
  const sections = $derived(navSections());

  openNavGroupsOnArrival(() => sections, routePathname);
</script>

{#if ready}
  <NavMain {sections} contributions={config.contributions} />
{/if}
