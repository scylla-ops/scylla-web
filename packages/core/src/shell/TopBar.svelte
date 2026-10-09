<script lang="ts">
  import type { ShellContributions } from '@scylla/core-sdk';
  import ShellBreadcrumbs from './ShellBreadcrumbs.svelte';
  import SidebarTrigger from './SidebarTrigger.svelte';

  let { contributions }: { contributions: readonly ShellContributions[] } = $props();
</script>

<header class="flex flex-row items-center gap-4 p-2">
  <SidebarTrigger />
  <ShellBreadcrumbs {contributions} />
</header>
