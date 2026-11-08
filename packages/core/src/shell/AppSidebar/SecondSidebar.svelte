<script lang="ts">
  import { fade } from 'svelte/transition';
  import type { Component } from 'svelte';
  import { prefersReducedMotion } from '@scylla/ui';
  import { Skeleton } from '@scylla/ui/primitives';
  import { cn } from '@scylla/ui/utils';
  import type { NavItem, SecondSidebarContent } from '../structs/nav-section.struct.ts';
  import { NAV_DANGER_APART_CLASS, NAV_HEADING_CLASS } from './nav-classes.ts';
  import { activePageOf } from './nav-rail.ts';

  interface Props {
    id?: string;
    content: SecondSidebarContent | undefined;
    pathname: string;
    ready: boolean;
    badges: readonly Component<{ url: string }>[];
    onOpenPage: (page: NavItem) => void;
    class?: string;
  }

  let { id, content, pathname, ready, badges, onOpenPage, class: className }: Props = $props();

  const active = $derived(content ? activePageOf(content.pages, pathname) : undefined);
  const SECTION_FADE_MS = 120;
</script>

<aside
  {id}
  data-slot="sidebar"
  class={cn('flex flex-col border-r border-sidebar-border bg-second-sidebar pb-2', className)}
>
  {#if !ready}
    <div class="flex h-12 shrink-0 items-center px-4">
      <Skeleton class="h-4 w-24" />
    </div>
    <div class="flex flex-col gap-0.5 px-2">
      {#each [0, 1, 2] as index (index)}
        <div class="flex h-8 items-center gap-2 px-2">
          <Skeleton class="size-4 shrink-0 rounded" />
          <Skeleton class="h-4 flex-1" />
        </div>
      {/each}
    </div>
  {:else if content}
    {#key content.id}
      <div
        class="flex min-h-0 flex-1 flex-col"
        in:fade={{ duration: prefersReducedMotion() ? 0 : SECTION_FADE_MS }}
      >
        <div class="flex h-12 shrink-0 items-center px-4">
          <h2 class="truncate text-base" title={content.title}>{content.title}</h2>
        </div>
        <ul class="relative flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2">
          {#each content.pages as page (page.href)}
            {@const current = page.href === active?.href}
            <li class={cn((page.danger || page.apart) && NAV_DANGER_APART_CLASS)}>
              {#if page.heading}
                <p class={NAV_HEADING_CLASS}>{page.heading}</p>
              {/if}
              <button
                type="button"
                class={cn(
                  'flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring motion-reduce:transition-none',
                  current ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-accent',
                  page.danger && 'text-destructive',
                )}
                aria-current={current ? 'page' : undefined}
                data-nav-url={page.url}
                onclick={() => onOpenPage(page)}
              >
                {#if page.icon}
                  <page.icon class="size-4 shrink-0" />
                {/if}
                <span class="min-w-0 flex-1 truncate" title={page.title}>{page.title}</span>
                {#each badges as Badge, index (index)}
                  <Badge url={page.url} />
                {/each}
              </button>
            </li>
          {/each}
        </ul>
      </div>
    {/key}
  {/if}
</aside>
