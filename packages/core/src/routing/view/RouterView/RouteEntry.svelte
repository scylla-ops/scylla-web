<script lang="ts">
  import { untrack, type Component } from 'svelte';
  import { Redirect, type RouteParams } from '@scylla/core-sdk';
  import { currentMatch, routeGuard } from '../runtime/route-state.svelte.ts';

  const { route, params } = untrack(() => {
    const match = currentMatch();
    return { route: match?.route, params: { ...match?.params } };
  });
  const wrappers = route?.wrappers ?? [];
  const Guard = routeGuard();
</script>

{#snippet content()}
  {#if route?.redirect !== undefined}
    <Redirect to={route.redirect} />
  {:else if route?.page}
    {#await route.page() then module}
      {@const Page = module.default as Component<RouteParams>}
      <Page {...params} />
    {/await}
  {/if}
{/snippet}

{#snippet guarded()}
  {#if route?.permission === undefined || !Guard}
    {@render content()}
  {:else}
    <Guard permission={route.permission}>
      {@render content()}
    </Guard>
  {/if}
{/snippet}

{#snippet wrapped(index: number)}
  {#if index < wrappers.length}
    {@const Wrapper = wrappers[index]}
    <Wrapper {params}>
      {@render wrapped(index + 1)}
    </Wrapper>
  {:else}
    {@render guarded()}
  {/if}
{/snippet}

{@render wrapped(0)}
