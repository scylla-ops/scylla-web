<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import {
    groupCatalog,
    searchCatalog,
    type CatalogEntry,
  } from '@base/features/pipeline/presentation/utils/node-catalog.ts';
  import { blueprintMessages } from '@base/features/pipeline/presentation/ui/editor/blueprint/blueprint.messages.ts';
  import {
    CATALOG_GROUP_TITLES,
    catalogText,
  } from '@base/features/pipeline/presentation/ui/editor/blueprint/catalog/catalog.ts';
  import CatalogItem from '@base/features/pipeline/presentation/ui/editor/blueprint/catalog/CatalogItem.svelte';
  import SearchField from '@base/features/pipeline/presentation/ui/editor/blueprint/controls/SearchField.svelte';
  import { dragToCanvas } from '@base/features/pipeline/presentation/ui/editor/blueprint/palette-drag/palette-drag.attachments.ts';
  import type { PaletteDrag } from '@base/features/pipeline/presentation/ui/editor/blueprint/palette-drag/palette-drag.state.svelte.ts';

  interface Props {
    entries: readonly CatalogEntry[];
    /** A click adds the entry right of the graph; a drag places it where it is dropped. */
    onAdd: (entry: CatalogEntry) => void;
    /** Lets a row be dragged onto the canvas. */
    drag?: PaletteDrag;
  }

  let { entries, onAdd, drag }: Props = $props();

  let query = $state('');

  const groups = $derived(groupCatalog(searchCatalog(entries, query, catalogText)));
</script>

<div class="flex h-full flex-col">
  <div class="flex flex-col gap-2.5 p-3 pb-2">
    <h2 class="px-1 text-sm font-semibold">{t(blueprintMessages.nodes)}</h2>
    <SearchField bind:value={query} label={t(blueprintMessages.searchNodes)} />
  </div>

  <div class="relative min-h-0 flex-1 overflow-y-auto px-2 pb-2">
    {#each groups as { group, items } (group)}
      <h3
        class="px-2 pt-3 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
      >
        {t(CATALOG_GROUP_TITLES[group])}
      </h3>
      {#each items as entry (entry.id)}
        <!-- A click adds the entry; a drag takes it to the canvas, and the row stays, dimmed. -->
        <button
          type="button"
          class={cn(
            'flex w-full cursor-grab items-center gap-2.5 rounded-lg p-2 transition-[background-color,opacity] select-none hover:bg-accent active:cursor-grabbing',
            drag?.entry?.id === entry.id && 'opacity-40',
          )}
          {@attach drag && dragToCanvas(() => ({ entry, drag }))}
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
