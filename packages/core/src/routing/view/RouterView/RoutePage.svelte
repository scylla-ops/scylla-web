<script lang="ts">
  import { PageTransition } from '@scylla/ui';
  import { location } from '../../runtime/location.state.svelte.ts';
  import { currentMatch } from '../../runtime/route.state.svelte.ts';
  import RouteEntry from './RouteEntry.svelte';

  let { animate = false }: { animate?: boolean } = $props();

  /**
   * What mounts the page again: the URL, less the params that the route keeps inside its page
   * (`inPageParams`). A tab of a page changes its param only: no new mount, no transition.
   */
  const pageKey = $derived.by(() => {
    const match = currentMatch();
    const inPage = match?.route.inPageParams;
    if (!match || !inPage?.length) return location.pathname;
    const kept = Object.entries(match.params).filter(([name]) => !inPage.includes(name));
    return `${match.route.path.join('/')}?${JSON.stringify(kept)}`;
  });
</script>

{#if animate}
  <PageTransition key={pageKey}>
    <RouteEntry />
  </PageTransition>
{:else}
  {#key pageKey}
    <RouteEntry />
  {/key}
{/if}
