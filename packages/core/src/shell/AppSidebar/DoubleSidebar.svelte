<script lang="ts">
  import { onDestroy, type Component } from 'svelte';
  import { navigateTo, routePathname, type ShellContributions } from '@scylla/core-sdk';
  import type {
    NavItem,
    NavSection,
    RailItem,
    SecondSidebarContent,
  } from '../structs/nav-section.struct.ts';
  import { railFor, secondSidebarFor, selectedRailItem } from './nav-rail.ts';
  import { RailState } from './rail.state.svelte.ts';
  import Rail from './Rail.svelte';
  import SecondSidebar from './SecondSidebar.svelte';

  interface Props {
    sections: NavSection[];
    params: Readonly<Record<string, string | undefined>>;
    ready: boolean;
    contributions: readonly ShellContributions[];
  }

  let { sections, params, ready, contributions }: Props = $props();

  let root = $state<HTMLElement>();

  // A menu opened from the rail is in a portal: the pointer leaves the rail to reach it.
  const railState = new RailState(() => !!root?.querySelector('[data-state="open"]'));
  onDestroy(() => railState.destroy());

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
    railState.selected();
    const first = item.pages[0];
    if (first) openPage(first);
  };

  const closeOnOutsideTouch = (event: PointerEvent) => {
    if (!railState.open || event.pointerType !== 'touch') return;
    if (!root?.contains(event.target as Node | null)) railState.close();
  };
</script>

<svelte:window onpointerdown={closeOnOutsideTouch} />

<div bind:this={root} data-slot="sidebar-container" class="relative h-svh w-64 shrink-0">
  <!-- No role: a touch here opens the rail, as a mouse does by hovering it. -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="absolute inset-x-0 top-0 z-30 flex h-17 items-center justify-center border-r border-b border-sidebar-border bg-background"
    onpointerup={event => {
      if (event.pointerType === 'touch') railState.tapped();
    }}
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
    {railState}
    onOpenItem={openItem}
    class="absolute top-17 bottom-0 left-0 z-20"
  />
  <SecondSidebar
    {content}
    {pathname}
    {ready}
    {badges}
    onOpenPage={openPage}
    class="absolute top-17 right-0 bottom-0 left-14"
  />
</div>
