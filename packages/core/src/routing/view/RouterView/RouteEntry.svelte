<script lang="ts">
  import { untrack, type Component } from 'svelte';
  import { Redirect, type RouteParams } from '@scylla/core-sdk';
  import { ErrorState } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { currentMatch, routeGuard } from '../../runtime/route.state.svelte.ts';
  import { routeEntryMessages } from './route-entry.messages.ts';

  const { route, params } = untrack(() => {
    const match = currentMatch();
    return { route: match?.route, params: { ...match?.params } };
  });
  const wrappers = route?.wrappers ?? [];
  const Guard = routeGuard();

  /** The boundary swallows the error: write it, so a bug of a page is still seen. */
  const reportPageError = (error: unknown) => console.error('[RouteEntry] page failed', error);
</script>

{#snippet content()}
  {#if route?.redirect !== undefined}
    <Redirect to={route.redirect} />
  {:else if route?.page}
    {#await route.page() then module}
      {@const Page = module.default as Component<RouteParams>}
      <!-- A page that throws fails alone: the layout, the shell and the wrappers stay. -->
      <svelte:boundary onerror={reportPageError}>
        <Page {...params} />

        {#snippet failed(_error, reset)}
          <div class="flex h-full flex-col items-center justify-center gap-4">
            <ErrorState
              title={t(routeEntryMessages.pageFailed)}
              message={t(routeEntryMessages.pageFailedBody)}
            />
            <Button variant="outline" onclick={reset}>{t(routeEntryMessages.tryAgain)}</Button>
          </div>
        {/snippet}
      </svelte:boundary>
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
