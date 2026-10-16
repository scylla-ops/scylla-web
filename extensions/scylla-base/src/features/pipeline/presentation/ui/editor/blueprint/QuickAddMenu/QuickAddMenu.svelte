<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import {
    MENU_SIZE,
    menuPosition,
    type QuickAdd,
  } from './quick-add.state.svelte.ts';
  import { START_NODE_ID } from '@base/features/pipeline/presentation/utils/blueprint-converter.ts';
  import { blueprintMessages } from '../blueprint.messages.ts';
  import { CATALOG_GROUP_TITLES } from '../catalog.ts';
  import CatalogItem from '../CatalogItem.svelte';
  import SearchField from '../SearchField.svelte';

  interface Props {
    quickAdd: QuickAdd;
  }

  let { quickAdd }: Props = $props();

  const uid = $props.id();
  const optionId = (index: number) => `${uid}-option-${index}`;

  const request = $derived(quickAdd.request);
  // Read when the menu opens: it lives only for one pick.
  const position = $derived(
    request &&
      menuPosition(request.client, { width: window.innerWidth, height: window.innerHeight }),
  );
  const title = $derived.by(() => {
    const link = request?.link;
    if (link && 'replacing' in link) return t(blueprintMessages.insertStep);
    if (link?.after && link.after !== START_NODE_ID) {
      return t(blueprintMessages.addAfter(link.after));
    }
    return t(blueprintMessages.addStep);
  });

  const focusOnMount: Attachment<HTMLInputElement> = node => node.focus();

  const onKeydown = (event: KeyboardEvent) => {
    // Tab leaves the menu: nothing traps the focus, so the menu goes with it.
    if (event.key === 'Tab') {
      quickAdd.close();
      return;
    }

    const actions: Record<string, () => void> = {
      ArrowDown: () => quickAdd.move(1),
      ArrowUp: () => quickAdd.move(-1),
      Enter: () => quickAdd.pick(),
      Escape: () => quickAdd.close(),
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };
</script>

{#if request && position}
  <button
    type="button"
    tabindex="-1"
    class="fixed inset-0 z-40 cursor-default"
    aria-label={t(blueprintMessages.closeMenu)}
    onclick={() => quickAdd.close()}
  ></button>

  <div
    role="dialog"
    aria-label={title}
    class="fixed z-50 flex flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg"
    style="left: {position.x}px; top: {position.y}px; width: {MENU_SIZE.width}px;"
  >
    <div class="flex flex-col gap-2 border-b p-2.5">
      <p class="px-1 text-xs text-muted-foreground">{title}</p>
      <!-- Driven from the search: the focus stays in it, the active option is announced. -->
      <SearchField
        bind:value={quickAdd.query}
        label={t(blueprintMessages.searchNodes)}
        role="combobox"
        aria-expanded="true"
        aria-controls="{uid}-list"
        aria-activedescendant={quickAdd.results.length > 0 ? optionId(quickAdd.active) : undefined}
        onkeydown={onKeydown}
        {@attach focusOnMount}
      />
    </div>

    <div id="{uid}-list" role="listbox" class="relative max-h-64 overflow-y-auto p-1.5">
      {#each quickAdd.groups as { group, items } (group)}
        <div role="group" aria-labelledby="{uid}-{group}">
          <p
            id="{uid}-{group}"
            class="px-2 pt-1.5 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
          >
            {t(CATALOG_GROUP_TITLES[group])}
          </p>
          {#each items as entry (entry.id)}
            {@const index = quickAdd.results.indexOf(entry)}
            <!-- An option, not a button: the search keeps the focus (`mousedown`). -->
            <div
              id={optionId(index)}
              role="option"
              tabindex="-1"
              aria-selected={index === quickAdd.active}
              class={cn(
                'flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5',
                index === quickAdd.active ? 'bg-sidebar-accent' : 'hover:bg-accent',
              )}
              onmousedown={event => event.preventDefault()}
              onclick={() => quickAdd.pick(entry)}
              onkeydown={onKeydown}
            >
              <CatalogItem {entry} compact />
            </div>
          {/each}
        </div>
      {:else}
        <p class="px-2 py-3 text-sm text-muted-foreground">{t(blueprintMessages.noMatch)}</p>
      {/each}
    </div>

    <div
      class="flex items-center gap-3 border-t bg-sidebar px-3.5 py-2 text-[11.5px] text-muted-foreground"
    >
      <span><kbd class="font-mono">↑↓</kbd> {t(blueprintMessages.keyNavigate)}</span>
      <span><kbd class="font-mono">↵</kbd> {t(blueprintMessages.keyAdd)}</span>
      <span><kbd class="font-mono">Esc</kbd> {t(blueprintMessages.keyCancel)}</span>
    </div>
  </div>
{/if}
