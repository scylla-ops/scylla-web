<script lang="ts">
  import type { Component } from 'svelte';
  import { t } from '@scylla/ui/i18n';
  import {
    SIDEBAR_FADE,
    SIDEBAR_MOTION,
    Skeleton,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
  } from '@scylla/ui/primitives';
  import { cn } from '@scylla/ui/utils';
  import { shellMessages } from '../shell.messages.ts';
  import type { Rail, RailItem } from '../structs/nav-section.struct.ts';

  interface Props {
    rail: Rail;
    selected: RailItem | undefined;
    ready: boolean;
    footers: readonly Component[];
    open: boolean;
    openWidth: number;
    onToggle: () => void;
    onOpenItem: (item: RailItem) => void;
    class?: string;
  }

  let {
    rail,
    selected,
    ready,
    footers,
    open,
    openWidth,
    onToggle,
    onOpenItem,
    class: className,
  }: Props = $props();

  const rowWidth = cn(
    'w-8 transition-[width,background-color,color] group-data-[state=expanded]:w-full',
    SIDEBAR_MOTION,
    'motion-reduce:transition-none',
  );
  const cursor = $derived(open ? 'cursor-w-resize' : 'cursor-e-resize');
  const label = $derived(t(shellMessages.toggleSidebar));

  const toggleOnEmptyPart = (event: MouseEvent) => {
    if (!(event.target as Element).closest('button, a')) onToggle();
  };
</script>

{#snippet row(item: RailItem)}
  {@const active = item.id === selected?.id}
  <!-- Only the content closes a tooltip that the pointer leaves, and the open rail has none. -->
  <Tooltip disabled={open} ignoreNonKeyboardFocus>
    <TooltipTrigger
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
    </TooltipTrigger>
    {#if !open}
      <TooltipContent side="right" sideOffset={12}>{item.title}</TooltipContent>
    {/if}
  </Tooltip>
{/snippet}

<!-- A click on an empty part is a shortcut for the pointer: the keyboard has the separator. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<nav
  data-sidebar="sidebar"
  data-slot="sidebar-rail-panel"
  data-state={open ? 'expanded' : 'collapsed'}
  data-collapsible={open ? '' : 'icon'}
  class={cn(
    'group border-r border-sidebar-border bg-rail text-sidebar-foreground transition-[width]',
    !open && 'w-14',
    cursor,
    SIDEBAR_MOTION,
    'motion-reduce:transition-none',
    className,
  )}
  style:width={open ? `${openWidth}px` : undefined}
  onclick={toggleOnEmptyPart}
>
  <div class="h-full overflow-hidden">
    <!-- The width of the open rail: the rows never reflow while the panel moves. -->
    <div class="flex h-full flex-col px-3 pt-2 pb-3" style:width="{openWidth}px">
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
  </div>

  <button
    type="button"
    data-slot="sidebar-rail-separator"
    class={cn(
      'absolute inset-y-0 -right-1.5 w-3 outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring',
      cursor,
    )}
    aria-label={label}
    aria-expanded={open}
    title={label}
    onclick={onToggle}
  ></button>
</nav>
