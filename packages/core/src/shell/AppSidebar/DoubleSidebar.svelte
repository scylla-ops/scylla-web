<script lang="ts">
  import { untrack, type Component } from 'svelte';
  import { navigateTo, routePathname, type ShellContributions } from '@scylla/core-sdk';
  import { cn } from '@scylla/ui/utils';
  import type {
    NavItem,
    NavSection,
    RailItem,
    SecondSidebarContent,
  } from '../structs/nav-section.struct.ts';
  import { railFor, secondSidebarFor, selectedRailItem, withModuleLinks } from './nav-rail.ts';
  import Rail from './Rail.svelte';
  import { createSecondSidebarWidth, RAIL_SLOT_PX } from './second-sidebar-width.state.svelte.ts';
  import SecondSidebar from './SecondSidebar.svelte';
  import SecondSidebarHandle from './SecondSidebarHandle.svelte';

  const SECOND_SIDEBAR_ID = 'second-sidebar';
  // The bar: the free room and the separator toggle the rail, the handle on its edge resizes it.
  const RAIL_BAR =
    '[data-slot="sidebar-rail-space"], [data-slot="sidebar-rail-separator"], [data-slot="second-sidebar-handle"]';

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
  const sidebarWidth = $derived(RAIL_SLOT_PX + width.current);

  // A menu opened from the rail is in a portal: a press in it is outside the rail.
  const menuIsOpen = () => !!root?.querySelector('[data-state="open"]');

  const pathname = $derived(routePathname());
  const rail = $derived(railFor(sections));
  const selected = $derived(selectedRailItem(rail, pathname));
  const content = $derived<SecondSidebarContent | undefined>(
    selected && secondSidebarFor(selected, sections, params),
  );
  // Once, in this component: a source can create a query.
  const linkSources = untrack(() =>
    contributions.flatMap(shell => shell.secondSidebarLinks?.(() => content?.id) ?? []),
  );
  const shown = $derived(
    content && withModuleLinks(content, linkSources.flatMap(links => links())),
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

  const onBar = (target: EventTarget | null) =>
    target instanceof Element && !!target.closest(RAIL_BAR);

  // After the handlers of the click: a choice in a menu of the rail closes the menu first.
  const closeOnClick = (event: MouseEvent) => {
    if (onBar(event.target)) return;
    queueMicrotask(() => {
      if (!menuIsOpen()) railOpen = false;
    });
  };

  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && !menuIsOpen()) railOpen = false;
  };
</script>

<svelte:window
  bind:innerWidth={viewportWidth}
  onpointerdown={closeOnOutsidePress}
  onclick={closeOnClick}
  onkeydown={closeOnEscape}
/>

<div
  bind:this={root}
  data-slot="sidebar-container"
  class="relative h-svh shrink-0"
  style:width="{sidebarWidth}px"
>
  <div
    data-slot="sidebar-brand"
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
    openWidth={sidebarWidth}
    onToggle={() => (railOpen = !railOpen)}
    onOpenItem={openItem}
    class={cn('absolute top-17 bottom-0 left-0 z-20', width.dragging && 'transition-none')}
  />
  <SecondSidebar
    id={SECOND_SIDEBAR_ID}
    content={shown}
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
      class="absolute top-17 -right-1.5 bottom-0 z-30"
    />
  {/if}
</div>
