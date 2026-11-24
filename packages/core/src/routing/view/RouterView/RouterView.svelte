<script lang="ts">
  import { listenToLocation } from '../../runtime/location.state.svelte.ts';
  import { currentMatch, routeFallback, routeShell } from '../../runtime/route.state.svelte.ts';
  import { splitPath } from '../../compilation/route-path.ts';
  import { location } from '../../runtime/location.state.svelte.ts';
  import RoutePage from './RoutePage.svelte';

  $effect(() => listenToLocation());

  const matched = $derived(currentMatch() !== null);
  const Layout = $derived(currentMatch()?.route.layout);
  const Shell = $derived(currentMatch()?.route.shell ? routeShell() : undefined);
  const space = $derived(currentMatch()?.route.space);
  const Fallback = $derived(routeFallback());
  // An unknown page inside a workspace (`/<workspace>/xyz`) keeps the shell around it.
  const fallbackShell = $derived(splitPath(location.pathname).length > 1 ? routeShell() : undefined);
</script>

{#snippet framed()}
  {#if Shell}
    <Shell {space}>
      <RoutePage animate />
    </Shell>
  {:else}
    <RoutePage animate />
  {/if}
{/snippet}

{#if !matched}
  {#if fallbackShell}
    {@const FallbackShell = fallbackShell}
    <FallbackShell>
      <Fallback />
    </FallbackShell>
  {:else}
    <Fallback />
  {/if}
{:else if Layout}
  <Layout>
    {@render framed()}
  </Layout>
{:else if Shell}
  {@render framed()}
{:else}
  <RoutePage />
{/if}
