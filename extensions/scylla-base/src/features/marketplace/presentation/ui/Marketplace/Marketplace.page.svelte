<script lang="ts">
  import { ErrorState, ListSkeleton } from '@scylla/ui';
  import { Tabs, TabsList, TabsTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { marketplaceMessages } from '@base/features/marketplace/presentation/messages/marketplace.messages.ts';
  import MarketplaceFilters from './MarketplaceFilters.svelte';
  import MarketplaceHeader from './MarketplaceHeader.svelte';
  import PackageCard from './PackageCard.svelte';
  import { createMarketplace, type MarketplaceTab } from './marketplace.state.svelte.ts';

  const marketplace = createMarketplace();

  const empty = $derived(
    marketplace.tab === 'added'
      ? marketplaceMessages.noneAdded(marketplace.workspaceName)
      : marketplace.tab === 'published'
        ? marketplaceMessages.nonePublished(marketplace.workspaceName)
        : marketplaceMessages.noMatch,
  );
</script>

{#if marketplace.isLoading}
  <ListSkeleton
    header
    rows={6}
    class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
    rowClass="h-44 w-full rounded-xl"
  />
{:else if marketplace.isError}
  <ErrorState message={t(marketplaceMessages.loadError)} />
{:else}
  <div class="flex min-h-full w-full flex-col gap-6 pb-20">
    <MarketplaceHeader {marketplace} />
    <Tabs value={marketplace.tab} onValueChange={value => (marketplace.tab = value as MarketplaceTab)}>
      <TabsList>
        <TabsTrigger value="explore">{t(marketplaceMessages.explore)}</TabsTrigger>
        <TabsTrigger value="added">
          {t(marketplaceMessages.addedTo(marketplace.workspaceName, marketplace.counts.added))}
        </TabsTrigger>
        <TabsTrigger value="published">
          {t(marketplaceMessages.publishedBy(marketplace.workspaceName, marketplace.counts.published))}
        </TabsTrigger>
      </TabsList>
    </Tabs>

    <div class="grid items-start gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <MarketplaceFilters {marketplace} />
      <section class="flex min-w-0 flex-col gap-3" aria-labelledby="marketplace-results">
        <div class="flex items-baseline gap-2 text-sm">
          <h2 id="marketplace-results" class="text-sm">
            {t(marketplaceMessages.fragmentCount(marketplace.shown.length))}
          </h2>
          {#if marketplace.filter.verifiedOnly}
            <span class="text-xs text-muted-foreground">{t(marketplaceMessages.verifiedPublishers)}</span>
          {/if}
          {#if marketplace.isFiltered}
            <button
              type="button"
              class="ml-auto text-xs font-medium text-primary hover:underline"
              onclick={() => marketplace.clear()}
            >
              {t(marketplaceMessages.clearFilters)}
            </button>
          {/if}
        </div>
        {#if marketplace.shown.length}
          <!-- Breakpoints are viewport-wide and the sidebars take ~29rem: late 2nd and 3rd columns. -->
          <ul class="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {#each marketplace.shown as pkg (pkg.id)}
              <li><PackageCard {pkg} status={marketplace.statusOf(pkg.id)} /></li>
            {/each}
          </ul>
        {:else}
          <p class="py-16 text-center text-sm text-muted-foreground">{t(empty)}</p>
        {/if}
      </section>
    </div>
  </div>
{/if}
