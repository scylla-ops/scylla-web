<script lang="ts">
  import { ErrorState, ListSkeleton } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { communityMessages } from '@base/features/pipeline/presentation/messages/community.messages.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import { createFragmentLibrary } from './fragment-library.state.svelte.ts';
  import FragmentCard from './FragmentCard.svelte';
  import LibraryFilters from './LibraryFilters.svelte';
  import LibraryToolbar from './LibraryToolbar.svelte';

  const library = createFragmentLibrary();
</script>

{#if library.isLoading}
  <ListSkeleton
    header
    rows={6}
    class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
    rowClass="h-44 w-full rounded-xl"
  />
{:else if library.isError}
  <ErrorState message={t(libraryMessages.loadError)} />
{:else}
  <div data-tour="library" class="flex min-h-full w-full flex-col gap-6 pb-20">
    <LibraryToolbar {library} />
    <LibraryFilters {library} />
    {#if library.isEmpty}
      <p class="py-16 text-center text-sm text-muted-foreground">
        {t(library.tab === 'community' ? communityMessages.noCommunity : libraryMessages.emptyLibrary)}
      </p>
    {:else if !library.shown.length}
      <p class="py-16 text-center text-sm text-muted-foreground">{t(libraryMessages.noFragment)}</p>
    {:else}
      <!-- Breakpoints are viewport-wide and the sidebar takes ~16rem: late 2nd and 3rd columns. -->
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {#each library.shown as fragment (fragment.id)}
          <FragmentCard {fragment} />
        {/each}
      </div>
    {/if}
  </div>
{/if}
