<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import {
    groupCatalog,
    searchCatalog,
    type CatalogEntry,
  } from '@base/features/pipeline/presentation/utils/node-catalog.ts';
  import { blueprintMessages } from '@base/features/pipeline/presentation/ui/editor/blueprint/blueprint.messages.ts';
  import {
    CATALOG_DRAG_TYPE,
    CATALOG_GROUP_TITLES,
    DRAG_LIFT,
    catalogText,
  } from '@base/features/pipeline/presentation/ui/editor/blueprint/catalog.ts';
  import CatalogItem from '@base/features/pipeline/presentation/ui/editor/blueprint/CatalogItem.svelte';
  import SearchField from '@base/features/pipeline/presentation/ui/editor/blueprint/SearchField.svelte';

  interface Props {
    entries: readonly CatalogEntry[];
    /** A click adds the entry right of the graph; a drag places it where it is dropped. */
    onAdd: (entry: CatalogEntry) => void;
  }

  let { entries, onAdd }: Props = $props();

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
        <button
          type="button"
          draggable="true"
          class="flex w-full cursor-grab items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-accent active:cursor-grabbing"
          ondragstart={event => {
            if (!event.dataTransfer) return;
            event.dataTransfer.setData(CATALOG_DRAG_TYPE, entry.id);
            // `move`, not `copy`: macOS adds a "+" badge to the pointer of a copy.
            event.dataTransfer.effectAllowed = 'move';
            // Only the icon, above the pointer: where the icon of the dropped node lands, so over
            // the canvas it sits inside the outline, and the pointer does not hide it.
            const icon = event.currentTarget.querySelector<HTMLElement>('[data-drag-image]');
            if (icon) {
              event.dataTransfer.setDragImage(
                icon,
                icon.offsetWidth / 2,
                icon.offsetHeight / 2 + DRAG_LIFT,
              );
            }
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
