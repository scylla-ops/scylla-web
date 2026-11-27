<script lang="ts">
  import { fade } from 'svelte/transition';
  import type { Component } from 'svelte';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import FolderIcon from '@lucide/svelte/icons/folder';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import {
    navigateTo,
    type SecondSidebarSearch,
    type SecondSidebarSectionAction,
  } from '@scylla/core-sdk';
  import {
    ColorGlyph,
    EntityIcon,
    enter,
    exit,
    MORPH_BOX_CLASS,
    morphHeight,
    motionDuration,
    prefersReducedMotion,
    StatusShape,
    swapIn,
    swapOut,
  } from '@scylla/ui';
  import {
    Input,
    Skeleton,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
  } from '@scylla/ui/primitives';
  import { cn } from '@scylla/ui/utils';
  import type { NavItem, SecondSidebarContent } from '../structs/nav-section.struct.ts';
  import { NAV_DANGER_APART_CLASS, NAV_HEADING_CLASS } from './nav-classes.ts';
  import { activePageOf, pageRuns, sectionMarks } from './nav-rail.ts';

  interface Props {
    id?: string;
    content: SecondSidebarContent | undefined;
    /** Replaces the title and the links of `content`. */
    panel?: Component;
    /** A search field above the links. */
    search?: SecondSidebarSearch;
    pathname: string;
    ready: boolean;
    badges: readonly Component<{ url: string }>[];
    onOpenPage: (page: NavItem) => void;
    /** The links only, with no title above them: the top bar of a space shows it. */
    untitled?: boolean;
    class?: string;
  }

  let {
    id,
    content,
    pathname,
    ready,
    badges,
    onOpenPage,
    panel: Panel,
    search,
    untitled = false,
    class: className,
  }: Props = $props();

  const active = $derived(content ? activePageOf(content.pages, pathname) : undefined);
  const runs = $derived(content ? pageRuns(content.pages) : []);
  const SECTION_FADE_MS = 120;
  const COUNT_FADE_MS = 150;
  /** The status shapes of the rows, and the smaller ones of the summary of a folded section. */
  const STATUS_PX = 14;
  const SUMMARY_STATUS_PX = 12;
</script>

{#snippet row(page: NavItem)}
  {@const current = page.href === active?.href}
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
    {#if page.entityIcon}
      <EntityIcon {...page.entityIcon} size={20} />
    {:else if page.icon}
      <page.icon class="size-4 shrink-0" />
    {/if}
    <span class="min-w-0 flex-1 truncate" title={page.title}>{page.title}</span>
    {#if page.status}
      <!-- One live mark at most, e.g. a job that runs: the shape of the status, as on the jobs.
           A new tone moves the same shape to its new form. -->
      <span
        data-part="second-sidebar-status"
        class="flex shrink-0"
        title={page.status.label}
        in:swapIn
        out:swapOut
      >
        <StatusShape state={page.status.tone} label={page.status.label} size={STATUS_PX} />
      </span>
    {/if}
    {#each badges as Badge, index (index)}
      <Badge url={page.url} />
    {/each}
  </button>
{/snippet}

{#snippet emptyRow(page: NavItem)}
  <!-- An empty section: one muted call to action, e.g. a new project in an empty group. -->
  <button
    type="button"
    class="flex h-8 w-full cursor-pointer items-center gap-2 rounded-lg px-2 text-left text-sm text-muted-foreground transition-colors outline-hidden hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring motion-reduce:transition-none"
    data-part="second-sidebar-empty-action"
    onclick={() => onOpenPage(page)}
  >
    <PlusIcon class="size-4 shrink-0" aria-hidden="true" />
    <span class="min-w-0 flex-1 truncate">{page.title}</span>
  </button>
{/snippet}

{#snippet sectionAction(action: SecondSidebarSectionAction)}
  <!-- At rest, a mouse sees no "+": it shows on hover and on focus. A touch screen always shows it. -->
  <Tooltip>
    <TooltipTrigger
      class="mr-1 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-[opacity,color,background-color] outline-hidden hover:bg-background hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-sidebar-ring motion-reduce:transition-none pointer-fine:opacity-0 pointer-fine:group-hover/section:opacity-100"
      data-part="second-sidebar-section-action"
      onclick={() => navigateTo(action.href)}
    >
      <PlusIcon class="size-3.5" aria-hidden="true" />
      <span class="sr-only">{action.label}</span>
    </TooltipTrigger>
    <TooltipContent>
      <p>{action.label}</p>
    </TooltipContent>
  </Tooltip>
{/snippet}

<aside
  {id}
  data-slot="sidebar"
  class={cn('flex flex-col border-r border-sidebar-border bg-second-sidebar pb-2', className)}
>
  {#if !ready}
    {#if !untitled}
      <div class="flex h-12 shrink-0 items-center px-4">
        <Skeleton class="h-4 w-24" />
      </div>
    {/if}
    <div class={cn('flex flex-col gap-0.5 px-2', untitled && 'pt-2')}>
      {#each [0, 1, 2] as index (index)}
        <div class="flex h-8 items-center gap-2 px-2">
          <Skeleton class="size-4 shrink-0 rounded" />
          <Skeleton class="h-4 flex-1" />
        </div>
      {/each}
    </div>
  {:else if Panel && content}
    {#key content.id}
      <Panel />
    {/key}
  {:else if content}
    {#key content.id}
      <div
        class="flex min-h-0 flex-1 flex-col"
        in:fade={{ duration: prefersReducedMotion() ? 0 : SECTION_FADE_MS }}
      >
        {#if !untitled}
          <div class="flex h-12 shrink-0 items-center px-4">
            <h2 class="truncate text-base" title={content.title}>{content.title}</h2>
          </div>
        {/if}
        {#if search}
          <div class={cn('shrink-0 px-2 pb-2', untitled && 'pt-2')}>
            <Input
              type="search"
              value={search.value}
              oninput={event => search.onchange(event.currentTarget.value)}
              placeholder={search.placeholder}
              aria-label={search.label}
              class="h-8 bg-background"
            />
          </div>
        {/if}
        <ul
          class={cn(
            'relative flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2',
            untitled && !search && 'pt-2',
          )}
        >
          {#if search?.empty}
            <li class="px-2 py-3 text-center text-sm text-muted-foreground">{search.empty}</li>
          {/if}
          {#each runs as run (run.key)}
            {#if run.section}
              {@const section = run.section}
              <li
                class={cn(run.pages[0]?.apart && NAV_DANGER_APART_CLASS)}
                data-part="second-sidebar-section"
              >
                <!-- The title of a section of links, e.g. a group of projects: it folds them. -->
                <div
                  class="group/section flex h-8 items-center rounded-lg transition-colors hover:bg-accent motion-reduce:transition-none"
                >
                  <button
                    type="button"
                    class="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left text-xs font-semibold text-muted-foreground outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                    aria-expanded={!section.folded}
                    onclick={() => section.onToggle(!section.folded)}
                  >
                    <ChevronRightIcon
                      class={cn(
                        'size-3.5 shrink-0 transition-transform duration-200 motion-reduce:transition-none',
                        !section.folded && 'rotate-90',
                      )}
                      aria-hidden="true"
                    />
                    {#if section.icon}
                      <section.icon class="size-4 shrink-0" aria-hidden="true" />
                    {:else}
                      <ColorGlyph icon={FolderIcon} color={section.color} />
                    {/if}
                    <span class="min-w-0 flex-1 truncate" title={section.title}>{section.title}</span>
                    {#if section.folded}
                      <!-- The hidden rows keep their news: a mark for each tone, a failure first. -->
                      {#each sectionMarks(run.pages) as mark (mark.tone)}
                        <span
                          data-part="second-sidebar-section-status"
                          class="flex shrink-0"
                          title={mark.label}
                          in:swapIn
                          out:swapOut
                        >
                          <StatusShape state={mark.tone} label={mark.label} size={SUMMARY_STATUS_PX} />
                        </span>
                      {/each}
                      <span
                        class="shrink-0 tabular-nums"
                        transition:fade={{ duration: motionDuration(COUNT_FADE_MS) }}
                      >
                        {run.pages.filter(page => !page.placeholder).length}
                      </span>
                    {/if}
                  </button>
                  {#if section.action}
                    {@render sectionAction(section.action)}
                  {/if}
                </div>
                <!-- The links fold in one box, as the cards of a section of the projects page. -->
                <div class={MORPH_BOX_CLASS} {@attach morphHeight}>
                  {#if !section.folded}
                    <!-- Indented under the title: the links belong to the section. -->
                    <ul class="flex flex-col gap-0.5 pt-0.5 pl-3" in:enter out:exit>
                      {#each run.pages as page (page.href)}
                        {#if !page.placeholder}
                          <li>{@render row(page)}</li>
                        {:else if page.href}
                          <li>{@render emptyRow(page)}</li>
                        {/if}
                      {/each}
                    </ul>
                  {/if}
                </div>
              </li>
            {:else}
              {#each run.pages as page (page.href)}
                <li class={cn((page.danger || page.apart) && NAV_DANGER_APART_CLASS)}>
                  {#if page.heading}
                    <p class={NAV_HEADING_CLASS}>{page.heading}</p>
                  {/if}
                  {@render row(page)}
                </li>
              {/each}
            {/if}
          {/each}
        </ul>
      </div>
    {/key}
  {/if}
</aside>
