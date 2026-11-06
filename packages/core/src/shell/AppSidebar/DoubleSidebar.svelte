<script lang="ts">
  import type { Component } from 'svelte';
  import { navigateTo, routePathname, type ShellContributions } from '@scylla/core-sdk';
  import type {
    NavItem,
    NavSection,
    RailItem,
    SecondSidebarContent,
  } from '../structs/nav-section.struct.ts';
  import { railFor, secondSidebarFor, selectedRailItem } from './nav-rail.ts';
  import Rail from './Rail.svelte';
  import { createSecondSidebarWidth, RAIL_SLOT_PX } from './second-sidebar-width.state.svelte.ts';
  import SecondSidebar from './SecondSidebar.svelte';
  import SecondSidebarHandle from './SecondSidebarHandle.svelte';

  const SECOND_SIDEBAR_ID = 'second-sidebar';

  interface Props {
    sections: NavSection[];
    params: Readonly<Record<string, string | undefined>>;
    ready: boolean;
    contributions: readonly ShellContributions[];
  }

  let { sections, params, ready, contributions }: Props = $props();

  let root = $state<HTMLElement>();
  let railOpen = $state(false);
  let viewportWidth = $state(window.innerWidth);
  const width = createSecondSidebarWidth(() => viewportWidth);

  // A menu opened from the rail is in a portal: a press in it is outside the rail.
  const menuIsOpen = () => !!root?.querySelector('[data-state="open"]');

  const pathname = $derived(routePathname());
  const rail = $derived(railFor(sections));
  const selected = $derived(selectedRailItem(rail, pathname));
  const content = $derived<SecondSidebarContent | undefined>(
    selected && secondSidebarFor(selected, sections, params),
  );

  const footers = $derived<readonly Component[]>(
    contributions.flatMap(shell => shell.sidebarFooter ?? []),
  );
  const badges = $derived(contributions.flatMap(shell => shell.navBadge ?? []));
  const Brand = $derived(contributions.flatMap(shell => shell.brand ?? []).at(-1));

  const openPage = (page: NavItem) => {
    contributions.forEach(shell => shell.onNavOpen?.(page.url));
    navigateTo(page.href);
  };

  const openItem = (item: RailItem) => {
    railOpen = false;
    const first = item.pages[0];
    if (first) openPage(first);
  };

  const closeOnOutsidePress = (event: PointerEvent) => {
    if (menuIsOpen() || root?.contains(event.target as Node | null)) return;
    railOpen = false;
  };

  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && !menuIsOpen()) railOpen = false;
  };
</script>

<svelte:window
  bind:innerWidth={viewportWidth}
  onpointerdown={closeOnOutsidePress}
  onkeydown={closeOnEscape}
/>

<div
  bind:this={root}
  data-slot="sidebar-container"
  class="relative h-svh shrink-0"
  style:width="{RAIL_SLOT_PX + width.current}px"
>
  <div
    class="absolute inset-x-0 top-0 z-30 flex h-17 items-center justify-center border-r border-b border-sidebar-border bg-background"
  >
    {#if Brand}
      <Brand />
    {/if}
  </div>
  <Rail
    {rail}
    {selected}
    {ready}
    {footers}
    open={railOpen}
    onToggle={() => (railOpen = !railOpen)}
    onOpenItem={openItem}
    class="absolute top-17 bottom-0 left-0 z-20"
  />
  <SecondSidebar
    id={SECOND_SIDEBAR_ID}
    {content}
    {pathname}
    {ready}
    {badges}
    onOpenPage={openPage}
    class="absolute top-17 right-0 bottom-0 left-14"
  />
  {#if ready && content}
    <SecondSidebarHandle
      {width}
      controls={SECOND_SIDEBAR_ID}
      class="absolute top-17 -right-1.5 bottom-0 z-10"
    />
  {/if}
</div>
