<script lang="ts">
  import { untrack } from 'svelte';
  import { navigateTo, routePathname, type ShellContributions } from '@scylla/core-sdk';
  import { getSidebar, SidebarGroup, SidebarGroupLabel } from '@scylla/ui/primitives';
  import type { NavItem, SecondSidebarContent } from '../structs/nav-section.struct.ts';
  import { NAV_SECTION_CARD_CLASS } from './nav-classes.ts';
  import { withModuleLinks } from './nav-rail.ts';
  import SecondSidebar from './SecondSidebar.svelte';

  interface Props {
    /** What the second sidebar of a computer shows for the URL. The sheet shows its pages already. */
    content: SecondSidebarContent;
    contributions: readonly ShellContributions[];
  }

  let { content, contributions }: Props = $props();

  const sidebar = getSidebar();
  const pathname = $derived(routePathname());

  // Once, in this component, as in the second sidebar: a source can create a query.
  const linkSources = untrack(() =>
    contributions.flatMap(shell => shell.secondSidebarLinks?.(() => content.id) ?? []),
  );
  const searchSources = untrack(() =>
    contributions.flatMap(shell => shell.secondSidebarSearch?.(() => content.id) ?? []),
  );
  const search = $derived(searchSources.map(source => source()).find(Boolean));
  // The card holds the links alone: the first one has no line above it.
  const links = $derived(
    linkSources.flatMap(source => source()).map(link => ({ ...link, apart: link.apart ?? false })),
  );
  const shown = $derived(withModuleLinks({ ...content, pages: [] }, links));
  const badges = $derived(contributions.flatMap(shell => shell.navBadge ?? []));

  const open = (page: NavItem) => {
    contributions.forEach(shell => shell.onNavOpen?.(page.url));
    navigateTo(page.href);
    sidebar.openMobile = false;
  };
</script>

<!-- The links of the modules, e.g. the projects: the second sidebar of a computer shows them. On a
     phone, they follow the section of the URL, in a card of their own. -->
{#if shown.pages.length > 0 || search}
  <SidebarGroup class={NAV_SECTION_CARD_CLASS} data-part="sheet-module-links">
    <SidebarGroupLabel>{content.title}</SidebarGroupLabel>
    <SecondSidebar
      content={shown}
      {search}
      {pathname}
      ready
      {badges}
      onOpenPage={open}
      untitled
      class="border-r-0 bg-transparent pb-0 [&>div>ul]:px-0"
    />
  </SidebarGroup>
{/if}
