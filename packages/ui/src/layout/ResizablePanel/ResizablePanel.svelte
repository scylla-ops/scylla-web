<script lang="ts">
  import type { Snippet } from 'svelte';
  import { t } from '../../i18n/i18n-svelte.svelte.ts';
  import { cn } from '../../utils/cn.ts';
  import { widthAfterDrag, widthAfterKey, type ResizeEdge } from './resizable-panel.ts';
  import { resizablePanelMessages } from './resizable-panel.messages.ts';

  interface Props {
    /** In pixels. Bind it to remember the width the user gave the panel. */
    width: number;
    min?: number;
    max?: number;
    edge?: ResizeEdge;
    /** The accessible name of the handle. */
    label?: string;
    class?: string;
    children: Snippet;
  }

  let {
    width = $bindable(),
    min = 240,
    max = 800,
    edge = 'start',
    label,
    class: className,
    children,
  }: Props = $props();

  let drag = $state<{ pointerId: number; x: number; width: number } | null>(null);
  const bounds = $derived({ min, max });

  const endDrag = (event: PointerEvent) => {
    if (drag?.pointerId === event.pointerId) drag = null;
  };
</script>

<!-- A panel with a handle on one edge: drag it, or focus it and use the arrow keys. -->
<div
  class={cn(
    'relative h-full shrink-0',
    // A width the user drags must follow the pointer; any other change is animated.
    !drag && 'transition-[width] duration-200 ease-out',
    className,
  )}
  style:width="{width}px"
>
  {@render children()}

  <!-- A focusable separator is the ARIA window splitter: an interactive widget. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
  <div
    role="separator"
    tabindex="0"
    aria-orientation="vertical"
    aria-label={label ?? t(resizablePanelMessages.resize)}
    aria-valuenow={width}
    aria-valuemin={min}
    aria-valuemax={max}
    data-slot="resize-handle"
    class={cn(
      'group absolute inset-y-0 z-10 w-3 cursor-col-resize touch-none outline-none',
      edge === 'start' ? '-left-1.5' : '-right-1.5',
    )}
    onpointerdown={event => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      drag = { pointerId: event.pointerId, x: event.clientX, width };
    }}
    onpointermove={event => {
      if (drag?.pointerId !== event.pointerId) return;
      width = widthAfterDrag(drag.width, event.clientX - drag.x, edge, bounds);
    }}
    onpointerup={endDrag}
    onpointercancel={endDrag}
    onkeydown={event => {
      const next = widthAfterKey(width, event.key, edge, bounds);
      if (next === null) return;
      event.preventDefault();
      width = next;
    }}
  >
    <span
      class={cn(
        'absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 transition-colors group-hover:bg-primary/40 group-focus-visible:bg-primary',
        drag && 'bg-primary',
      )}
    ></span>
  </div>
</div>
