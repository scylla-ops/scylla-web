<script lang="ts">
  import CopyIcon from '@lucide/svelte/icons/copy';
  import GripHorizontalIcon from '@lucide/svelte/icons/grip-horizontal';
  import MinusIcon from '@lucide/svelte/icons/minus';
  import SlidersHorizontalIcon from '@lucide/svelte/icons/sliders-horizontal';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { LayoutWidget } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
  import { editorMessages as messages } from '@base/features/dashboard/presentation/messages/editor.messages.ts';
  import {
    cellsText,
    DATA,
    SIZE_ORDER,
    shownSize,
    sizeLabel,
    sizeShort,
  } from '@base/features/dashboard/presentation/presenters/widget-catalog.presenter.ts';
  import { sizeAt, sizeBox } from '@base/features/dashboard/presentation/presenters/widget-resize.presenter.ts';
  import { dashboardEditor } from '@base/features/dashboard/presentation/ui/dashboard-editor.state.svelte.ts';
  import type { Snippet } from 'svelte';

  interface Props {
    item: LayoutWidget;
    title: string;
    onOpenData: () => void;
    children: Snippet;
  }

  let { item, title, onOpenData, children }: Props = $props();

  let frame = $state<HTMLElement | null>(null);
  let resizing = $state<{
    x: number;
    y: number;
    width: number;
    height: number;
    grid: number;
    drawn: { width: number; height: number };
    /** From the left of the grid to the left of the widget, in px. */
    left: number;
  } | null>(null);

  const size = $derived(shownSize(item.data, item.size));
  const options = $derived(
    resizing
      ? SIZE_ORDER.filter(option => DATA[item.data].sizes.includes(option)).map(option => {
          const box = sizeBox(option, resizing!.grid);
          const current = sizeBox(size, resizing!.grid);
          return {
            size: option,
            ...box,
            fits: resizing!.left + box.width <= resizing!.grid + 1,
            inside: box.width <= current.width + 1 && box.height <= current.height + 1,
          };
        })
      : [],
  );
  const sizes = $derived(DATA[item.data].sizes);
  const selected = $derived(dashboardEditor.selected === item.id);

  /** The left of the cell of the widget in the grid, without the transform of a move in progress. */
  const leftInGrid = (): number | null => {
    const cell = frame?.parentElement;
    const grid = frame?.closest<HTMLElement>('[data-slot="widget-grid"]');
    if (!cell || !grid) return null;
    return cell.offsetParent === grid.offsetParent ? cell.offsetLeft - grid.offsetLeft : cell.offsetLeft;
  };

  const startResize = (event: PointerEvent) => {
    if (!frame) return;
    event.preventDefault();
    event.stopPropagation();
    const box = frame.getBoundingClientRect();
    const grid = frame.closest('[data-slot="widget-grid"]')?.clientWidth ?? box.width;
    resizing = {
      x: event.clientX,
      y: event.clientY,
      width: box.width,
      height: box.height,
      grid,
      drawn: { width: box.width, height: box.height },
      left: leftInGrid() ?? 0,
    };
  };

  const moveResize = (event: PointerEvent) => {
    if (!resizing) return;
    const width = Math.max(24, resizing.width + event.clientX - resizing.x);
    const height = Math.max(24, resizing.height + event.clientY - resizing.y);
    resizing = { ...resizing, drawn: { width, height }, left: leftInGrid() ?? resizing.left };
    const next = sizeAt(width, height, resizing.grid, sizes);
    if (next !== size) dashboardEditor.resizeLive(item.id, next);
  };

  const endResize = () => {
    resizing = null;
    dashboardEditor.commitResize();
  };
</script>

<svelte:window
  onpointermove={event => {
    if (resizing) moveResize(event);
  }}
  onpointerup={() => {
    if (resizing) endResize();
  }}
  onpointercancel={() => {
    if (!resizing) return;
    resizing = null;
    dashboardEditor.cancelResize();
  }}
/>

<div
  bind:this={frame}
  role="group"
  aria-label={title}
  data-slot="editable-widget"
  data-selected={selected || undefined}
  data-resizing={resizing ? true : undefined}
  class={cn(
    'group/edit relative size-full [&>[data-slot=widget]]:pointer-events-none [&>[data-slot=widget]]:size-full',
    resizing && '[&>[data-slot=widget]]:z-10 [&>[data-slot=widget]]:bg-background',
  )}
>
  {@render children()}

  <button
    type="button"
    class="absolute inset-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary"
    aria-label={title}
    aria-pressed={selected}
    onclick={() => dashboardEditor.select(item.id)}
  ></button>

  <span
    aria-hidden="true"
    class={cn(
      'pointer-events-none absolute inset-0 rounded-2xl ring-inset',
      selected ? 'ring-2 ring-primary' : 'ring-1 ring-transparent group-hover/edit:ring-primary/40',
    )}
  ></span>

  <button
    type="button"
    class="absolute -top-2.5 -left-2.5 z-10 flex size-5 items-center justify-center rounded-full bg-foreground text-background shadow"
    aria-label={t(messages.takeOut(title))}
    title={t(messages.takeOut(title))}
    onclick={event => {
      event.stopPropagation();
      dashboardEditor.remove(item.id);
    }}
  >
    <MinusIcon class="size-3" aria-hidden="true" />
  </button>

  <button
    type="button"
    class="absolute -top-2 left-1/2 z-10 flex h-4 w-8 -translate-x-1/2 cursor-grab touch-none items-center justify-center rounded-full border border-border bg-background text-muted-foreground active:cursor-grabbing"
    aria-label={t(messages.move(title))}
    title={t(messages.move(title))}
    onpointerdown={event => {
      if (event.button !== 0) return;
      event.preventDefault();
      const box = frame?.getBoundingClientRect();
      dashboardEditor.press(
        {
          from: 'grid',
          id: item.id,
          data: item.data,
          size,
          label: title,
          grab: { x: event.clientX - (box?.left ?? 0), y: event.clientY - (box?.top ?? 0) },
        },
        event.clientX,
        event.clientY,
      );
    }}
  >
    <GripHorizontalIcon class="size-3" aria-hidden="true" />
  </button>

  {#if sizes.length > 1}
    <button
      type="button"
      class="absolute -right-1 -bottom-1 z-10 size-3 cursor-nwse-resize border-r-2 border-b-2 border-foreground/70"
      aria-label={t(messages.resize(title))}
      title={t(messages.resize(title))}
      onpointerdown={startResize}
    ></button>
  {/if}

  {#if resizing}
    {#each options as option (option.size)}
      <div
        data-slot="resize-option"
        data-size={option.size}
        data-chosen={option.size === size || undefined}
        data-fits={option.fits}
        data-inside={option.inside || undefined}
        aria-hidden="true"
        class={cn(
          'pointer-events-none absolute top-0 left-0 rounded-2xl',
          option.inside ? 'z-30 shadow-[0_0_0_1px_var(--background),inset_0_0_0_1px_var(--background)]' : 'z-0',
          option.size === size
            ? cn('border-[3px] border-primary', !option.inside && 'bg-primary/10')
            : 'border-2 border-dashed border-primary/85 dark:border-primary',
          !option.fits && 'border-muted-foreground/60 opacity-50',
        )}
        style="width: {option.width}px; height: {option.height}px"
      ></div>
    {/each}
    {#each options as option (option.size)}
      <span
        data-slot={option.size === size ? 'resize-size' : 'resize-option-label'}
        aria-hidden="true"
        class={cn(
          'pointer-events-none absolute z-40 -translate-x-full -translate-y-full rounded-md px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap shadow-sm',
          option.size === size ? 'bg-primary text-primary-foreground' : 'border border-primary/70 bg-background text-foreground',
          !option.fits && 'opacity-40',
        )}
        style="left: {option.width - 6}px; top: {option.height - 6}px"
      >
        {cellsText(option.size)} · {sizeLabel(option.size)}
      </span>
    {/each}
    <div
      data-slot="resize-outline"
      aria-hidden="true"
      class="pointer-events-none absolute top-0 left-0 z-30 rounded-2xl border-2 border-dashed border-primary bg-primary/5"
      style="width: {resizing.drawn.width}px; height: {resizing.drawn.height}px"
    ></div>
  {/if}

  {#if selected}
    <div
      role="toolbar"
      tabindex="-1"
      aria-label={title}
      class="absolute -top-12 left-0 z-20 flex h-9 items-center gap-1 rounded-lg bg-foreground px-1.5 text-background shadow-lg"
      onclick={event => event.stopPropagation()}
      onkeydown={event => event.stopPropagation()}
    >
      <div role="radiogroup" aria-label={t(messages.sizeOf(title))} class="flex items-center gap-0.5 rounded-md bg-background/10 p-0.5">
        {#each SIZE_ORDER as option (option)}
          {@const allowed = sizes.includes(option)}
          <button
            type="button"
            role="radio"
            aria-checked={option === size}
            disabled={!allowed}
            title={allowed ? sizeLabel(option) : t(messages.notInThisSize)}
            class={cn(
              'h-6 min-w-6 rounded px-1.5 text-[11px] font-medium',
              option === size ? 'bg-background text-foreground' : 'hover:bg-background/15',
              !allowed && 'opacity-35',
            )}
            onclick={() => dashboardEditor.resize(item.id, option)}
          >
            {sizeShort(option)}
          </button>
        {/each}
      </div>
      <button type="button" class="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs hover:bg-background/15" onclick={onOpenData}>
        <SlidersHorizontalIcon class="size-3.5" aria-hidden="true" />
        {t(messages.data)}
      </button>
      <button
        type="button"
        class="flex size-7 items-center justify-center rounded-md hover:bg-background/15"
        aria-label={t(messages.duplicate)}
        title={t(messages.duplicate)}
        onclick={() => dashboardEditor.duplicate(item.id)}
      >
        <CopyIcon class="size-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="flex size-7 items-center justify-center rounded-md hover:bg-background/15"
        aria-label={t(messages.takeOutSelected)}
        title={t(messages.takeOutSelected)}
        onclick={() => dashboardEditor.remove(item.id)}
      >
        <Trash2Icon class="size-3.5" aria-hidden="true" />
      </button>
    </div>
  {/if}
</div>
