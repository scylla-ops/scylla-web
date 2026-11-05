<script lang="ts">
  import type { Component } from 'svelte';
  import { SIDEBAR_FADE, SIDEBAR_MOTION, Skeleton } from '@scylla/ui/primitives';
  import { cn } from '@scylla/ui/utils';
  import type { Rail, RailItem } from '../structs/nav-section.struct.ts';
  import type { RailState } from './rail.state.svelte.ts';

  interface Props {
    rail: Rail;
    selected: RailItem | undefined;
    ready: boolean;
    footers: readonly Component[];
    railState: RailState;
    onOpenItem: (item: RailItem) => void;
    class?: string;
  }

  let { rail, selected, ready, footers, railState, onOpenItem, class: className }: Props = $props();

  const rowWidth = cn(
    'w-8 transition-[width,background-color,color] group-data-[state=expanded]:w-58',
    SIDEBAR_MOTION,
    'motion-reduce:transition-none',
  );
</script>

{#snippet row(item: RailItem)}
  {@const active = item.id === selected?.id}
  <button
    type="button"
    class={cn(
      'flex h-8 shrink-0 items-center gap-2 overflow-hidden rounded-lg px-2 text-left text-sm outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring',
      rowWidth,
      active ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'hover:bg-accent',
    )}
    aria-current={active ? 'page' : undefined}
    data-nav-url={item.pages[0]?.url}
    data-nav-group={item.group}
    onclick={() => onOpenItem(item)}
  >
    {#if item.icon}
      <item.icon class="size-4 shrink-0" />
    {/if}
    <span class={cn('truncate', SIDEBAR_FADE)}>{item.title}</span>
  </button>
{/snippet}

<!-- The rail opens on hover and on focus of its rows: the listeners are for that, not for a click. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<nav
  data-sidebar="sidebar"
  data-slot="sidebar-rail-panel"
  data-state={railState.open ? 'expanded' : 'collapsed'}
  data-collapsible={railState.open ? '' : 'icon'}
  class={cn(
    'group overflow-hidden border-r border-sidebar-border bg-background text-sidebar-foreground transition-[width]',
    railState.open ? 'w-64' : 'w-14',
    SIDEBAR_MOTION,
    'motion-reduce:transition-none',
    className,
  )}
  onpointermove={event => railState.pointerMoved(event.pointerType)}
  onpointerleave={event => railState.pointerLeft(event.pointerType)}
  onfocusin={event => {
    if ((event.target as HTMLElement).matches(':focus-visible')) railState.focusEntered();
  }}
  onfocusout={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) railState.focusLeft();
  }}
  onkeydown={event => {
    if (event.key === 'Escape') railState.close();
  }}
>
  <!-- A fixed width: the rows never reflow while the panel moves. -->
  <div class="flex h-full w-64 flex-col px-3 pt-2 pb-3">
    <div class="relative flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto">
      {#if ready}
        {#each rail.main as item (item.id)}
          {@render row(item)}
        {/each}
      {:else}
        {#each [0, 1, 2, 3] as index (index)}
          <div class="flex h-8 w-8 shrink-0 items-center px-2">
            <Skeleton class="size-4 rounded" />
          </div>
        {/each}
      {/if}
    </div>

    {#if ready && rail.end.length > 0}
      <div class="mt-2 flex flex-col gap-2">
        {#each rail.end as item (item.id)}
          {@render row(item)}
        {/each}
      </div>
    {/if}

    {#if footers.length > 0}
      <div class={cn('mt-3 mb-2 border-t border-sidebar-border', rowWidth)}></div>
      <div class="flex flex-col gap-2">
        {#each footers as Footer, index (index)}
          <Footer />
        {/each}
      </div>
    {/if}
  </div>
</nav>
