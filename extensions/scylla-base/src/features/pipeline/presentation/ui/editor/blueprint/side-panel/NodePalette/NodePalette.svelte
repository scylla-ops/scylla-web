<script lang="ts">
  import SearchIcon from '@lucide/svelte/icons/search';
  import { t } from '@scylla/ui/i18n';
  import {
    CATALOG_DRAG_TYPE,
    catalogText,
    searchCatalog,
    type CatalogEntry,
  } from '@base/features/pipeline/presentation/utils/node-catalog.ts';
  import { blueprintMessages } from '@base/features/pipeline/presentation/ui/editor/blueprint/blueprint.messages.ts';
  import CatalogItem from '@base/features/pipeline/presentation/ui/editor/blueprint/CatalogItem.svelte';

  interface Props {
    entries: readonly CatalogEntry[];
    /** A click adds the entry right of the graph; a drag places it where it is dropped. */
    onAdd: (entry: CatalogEntry) => void;
  }

  let { entries, onAdd }: Props = $props();

  let query = $state('');

  const results = $derived(searchCatalog(entries, query, catalogText));
  const groups = $derived(
    [
      { title: blueprintMessages.steps, items: results.filter(entry => entry.group === 'steps') },
      {
        title: blueprintMessages.templates,
        items: results.filter(entry => entry.group === 'templates'),
      },
    ].filter(group => group.items.length > 0),
  );
</script>

<div class="flex h-full flex-col">
  <div class="flex flex-col gap-2.5 p-3 pb-2">
    <h2 class="px-1 text-sm font-semibold">{t(blueprintMessages.nodes)}</h2>
    <label
      class="flex h-8.5 items-center gap-2 rounded-lg border bg-background px-2.5 text-muted-foreground focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/20"
    >
      <SearchIcon class="size-4 shrink-0" />
      <input
        class="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        placeholder={t(blueprintMessages.searchNodes)}
        aria-label={t(blueprintMessages.searchNodes)}
        bind:value={query}
      />
    </label>
  </div>

  <div class="relative min-h-0 flex-1 overflow-y-auto px-2 pb-2">
    {#each groups as group (group.title.id)}
      <h3
        class="px-2 pt-3 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
      >
        {t(group.title)}
      </h3>
      {#each group.items as entry (entry.id)}
        <button
          type="button"
          draggable="true"
          class="flex w-full cursor-grab items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-accent active:cursor-grabbing"
          ondragstart={event => {
            event.dataTransfer?.setData(CATALOG_DRAG_TYPE, entry.id);
            if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
          }}
          onclick={() => onAdd(entry)}
        >
          <CatalogItem {entry} />
        </button>
      {/each}
    {:else}
      <p class="px-2 py-4 text-sm text-muted-foreground">{t(blueprintMessages.noMatch)}</p>
    {/each}
  </div>

  <p class="border-t px-4 py-3 text-[11.5px] leading-relaxed text-muted-foreground">
    {t(blueprintMessages.paletteHint)}
  </p>
</div>
