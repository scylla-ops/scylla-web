<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import SearchIcon from '@lucide/svelte/icons/search';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { QuickAdd } from '@base/features/pipeline/presentation/quick-add.state.svelte.ts';
  import { START_NODE_ID } from '@base/features/pipeline/presentation/utils/blueprint-converter.ts';
  import { blueprintMessages } from '../blueprint.messages.ts';
  import CatalogItem from '../CatalogItem.svelte';

  interface Props {
    quickAdd: QuickAdd;
  }

  let { quickAdd }: Props = $props();

  const MENU_WIDTH = 300;
  const MENU_HEIGHT = 400;
  const MARGIN = 8;

  const request = $derived(quickAdd.request);
  // Kept inside the window, as it is when the menu opens: it lives only for one pick.
  const left = $derived(
    Math.max(
      MARGIN,
      Math.min((request?.client.x ?? 0) + MARGIN, window.innerWidth - MENU_WIDTH - MARGIN),
    ),
  );
  const top = $derived(
    Math.max(
      MARGIN,
      Math.min((request?.client.y ?? 0) - 24, window.innerHeight - MENU_HEIGHT - MARGIN),
    ),
  );
  const title = $derived(
    request?.replacing
      ? t(blueprintMessages.insertStep)
      : request?.after && request.after !== START_NODE_ID
        ? t(blueprintMessages.addAfter(request.after))
        : t(blueprintMessages.addStep),
  );

  const focusOnMount: Attachment<HTMLInputElement> = node => node.focus();

  const onKeydown = (event: KeyboardEvent) => {
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

{#if request}
  <button
    type="button"
    class="fixed inset-0 z-40 cursor-default"
    aria-label={t(blueprintMessages.closeMenu)}
    onclick={() => quickAdd.close()}
  ></button>

  <div
    role="dialog"
    aria-label={title}
    class="fixed z-50 flex w-75 flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg"
    style="left: {left}px; top: {top}px;"
  >
    <div class="flex flex-col gap-2 border-b p-2.5">
      <p class="px-1 text-xs text-muted-foreground">{title}</p>
      <label
        class="flex h-8.5 items-center gap-2 rounded-lg border bg-background px-2.5 text-muted-foreground focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/20"
      >
        <SearchIcon class="size-4 shrink-0" />
        <input
          class="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          placeholder={t(blueprintMessages.searchNodes)}
          aria-label={t(blueprintMessages.searchNodes)}
          value={quickAdd.query}
          oninput={event => (quickAdd.query = event.currentTarget.value)}
          onkeydown={onKeydown}
          {@attach focusOnMount}
        />
      </label>
    </div>

    <div class="relative max-h-64 overflow-y-auto p-1.5">
      {#each quickAdd.results as entry, index (entry.id)}
        {#if index === 0 || quickAdd.results[index - 1].group !== entry.group}
          <p
            class="px-2 pt-1.5 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
          >
            {t(entry.group === 'steps' ? blueprintMessages.steps : blueprintMessages.templates)}
          </p>
        {/if}
        <button
          type="button"
          data-active={index === quickAdd.active}
          class={cn(
            'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5',
            index === quickAdd.active ? 'bg-sidebar-accent' : 'hover:bg-accent',
          )}
          onclick={() => quickAdd.pick(entry)}
        >
          <CatalogItem {entry} compact />
        </button>
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
