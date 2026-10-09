<script lang="ts">
  import { listenToLocation } from '../../runtime/location.svelte.ts';
  import { currentMatch, routeFallback, routeShell } from '../../runtime/route-state.svelte.ts';
  import RoutePage from '../RoutePage.svelte';

  $effect(() => listenToLocation());

  const matched = $derived(currentMatch() !== null);
  const Layout = $derived(currentMatch()?.route.layout);
  const Shell = $derived(currentMatch()?.route.shell ? routeShell() : undefined);
  const Fallback = $derived(routeFallback());
</script>

{#snippet framed()}
  {#if Shell}
    <Shell>
      <RoutePage animate />
    </Shell>
  {:else}
    <RoutePage animate />
  {/if}
{/snippet}

{#if !matched}
  <Fallback />
{:else if Layout}
  <Layout>
    {@render framed()}
  </Layout>
{:else if Shell}
  {@render framed()}
{:else}
  <RoutePage />
{/if}
