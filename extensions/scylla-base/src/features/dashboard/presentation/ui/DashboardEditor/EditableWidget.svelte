<script lang="ts">
  import CopyIcon from '@lucide/svelte/icons/copy';
  import GripHorizontalIcon from '@lucide/svelte/icons/grip-horizontal';
  import MinusIcon from '@lucide/svelte/icons/minus';
  import SlidersHorizontalIcon from '@lucide/svelte/icons/sliders-horizontal';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import { widgetSpanStyle } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type {
    LayoutSize,
    LayoutWidget,
  } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
  import { editorMessages as messages } from '@base/features/dashboard/presentation/messages/editor.messages.ts';
  import {
    cellsText,
    DATA,
    SIZE_ORDER,
    shownSize,
    sizeLabel,
    sizeShort,
  } from '@base/features/dashboard/presentation/presenters/widget-catalog.presenter.ts';
  import { sizeAt } from '@base/features/dashboard/presentation/presenters/widget-resize.presenter.ts';
  import { dashboardEditor } from '@base/features/dashboard/presentation/ui/dashboard-editor.state.svelte.ts';
  import type { Snippet } from 'svelte';

  interface Props {
    item: LayoutWidget;
    index: number;
    title: string;
    onOpenData: () => void;
    children: Snippet;
  }

  let { item, index, title, onOpenData, children }: Props = $props();

  let frame = $state<HTMLElement | null>(null);
  let resizing = $state<{ x: number; y: number; width: number; height: number; to: LayoutSize } | null>(
    null,
  );

  const size = $derived(shownSize(item.data, item.size));
  const sizes = $derived(DATA[item.data].sizes);
  const selected = $derived(dashboardEditor.selected === item.id);
  const dragged = $derived(
    dashboardEditor.drag?.from === 'grid' && dashboardEditor.drag.id === item.id,
  );

  const onDragOver = (event: DragEvent) => {
    if (!dashboardEditor.drag || !frame) return;
    event.preventDefault();
    const box = frame.getBoundingClientRect();
    const after = event.clientX > box.left + box.width / 2;
    dashboardEditor.dragOver(after ? index + 1 : index);
  };

  const startResize = (event: PointerEvent) => {
    if (!frame) return;
    event.preventDefault();
    event.stopPropagation();
    const box = frame.getBoundingClientRect();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    resizing = { x: event.clientX, y: event.clientY, width: box.width, height: box.height, to: size };
  };

  const moveResize = (event: PointerEvent) => {
    if (!resizing || !frame?.parentElement) return;
    const width = resizing.width + event.clientX - resizing.x;
    const height = resizing.height + event.clientY - resizing.y;
    resizing = { ...resizing, to: sizeAt(width, height, frame.parentElement.clientWidth, sizes) };
  };

  const endResize = () => {
    if (resizing) dashboardEditor.resize(item.id, resizing.to);
    resizing = null;
  };
</script>

<div
  bind:this={frame}
  role="group"
  aria-label={title}
  data-slot="editable-widget"
  data-selected={selected || undefined}
  style={widgetSpanStyle(size)}
  class={cn(
    'group/edit relative col-span-(--widget-columns) row-span-(--widget-rows) @3xl:col-span-(--widget-columns-wide) @3xl:row-span-(--widget-rows-wide)',
    '[&>[data-slot=widget]]:h-full [&>[data-slot=widget]]:pointer-events-none',
    dragged && 'opacity-40',
  )}
  ondragover={onDragOver}
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
    draggable="true"
    class="absolute -top-2 left-1/2 z-10 flex h-4 w-8 -translate-x-1/2 cursor-grab items-center justify-center rounded-full border border-border bg-background text-muted-foreground active:cursor-grabbing"
    aria-label={t(messages.move(title))}
    title={t(messages.move(title))}
    ondragstart={event => {
      dashboardEditor.startDrag({ from: 'grid', id: item.id, size });
      event.dataTransfer?.setData('text/plain', item.id);
      if (event.dataTransfer && frame) event.dataTransfer.setDragImage(frame, 24, 24);
    }}
    ondragend={() => dashboardEditor.endDrag()}
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
      onpointermove={moveResize}
      onpointerup={endResize}
      onpointercancel={() => (resizing = null)}
    ></button>
  {/if}

  {#if resizing}
    <span
      class="absolute right-2 bottom-2 z-20 rounded-md bg-foreground px-2 py-1 font-mono text-[11px] text-background"
    >
      {cellsText(size)} → {cellsText(resizing.to)} · {sizeLabel(resizing.to)}
    </span>
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
