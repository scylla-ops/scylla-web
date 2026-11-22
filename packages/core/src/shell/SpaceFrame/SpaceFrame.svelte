<script lang="ts">
  import type { Snippet } from 'svelte';
  import { navigateTo, routePathname, type NavSectionDefinition } from '@scylla/core-sdk';
  import { getSidebar, SidebarInset } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import AppSidebar from '../AppSidebar/AppSidebar.svelte';
  import { sectionPages } from '../AppSidebar/nav-rail.ts';
  import { reactiveNavSections } from '../AppSidebar/nav-sections.svelte.ts';
  import SecondSidebar from '../AppSidebar/SecondSidebar.svelte';
  import type { ShellConfig } from '../shell-config.ts';
  import type { NavItem, SecondSidebarContent } from '../structs/nav-section.struct.ts';
  import SidebarTrigger from '../TopBar/SidebarTrigger.svelte';

  type SpaceSection = NavSectionDefinition & Required<Pick<NavSectionDefinition, 'space'>>;

  interface Props {
    config: ShellConfig;
    /** The section of the space: its links, its title, its icon and its bar. */
    section: SpaceSection;
    children: Snippet;
  }

  let { config, section, children }: Props = $props();

  const sidebar = getSidebar();

  const ready = $derived(config.access?.ready() ?? true);
  const navSections = reactiveNavSections(() => config);
  const content = $derived<SecondSidebarContent>({
    id: section.id,
    title: t(section.title),
    pages: navSections()
      .filter(({ id }) => id === section.id)
      .flatMap(sectionPages),
  });
  // The sheet of a phone shows the links of the space only.
  const sheetConfig = $derived<ShellConfig>({ ...config, sections: [section] });

  const footers = $derived(config.contributions.flatMap(shell => shell.sidebarFooter ?? []));
  const badges = $derived(config.contributions.flatMap(shell => shell.navBadge ?? []));
  const Icon = $derived(section.space.icon);
  const Bar = $derived(section.space.bar);

  const openPage = (page: NavItem) => {
    config.contributions.forEach(shell => shell.onNavOpen?.(page.url));
    navigateTo(page.href);
  };
</script>

<div data-slot="space-frame" class="flex h-svh w-full min-w-0 flex-col">
  <header class="flex h-14 shrink-0 items-stretch bg-second-sidebar md:h-17">
    <!-- As wide as the column of the links: the two lines meet the line of the column. -->
    <div
      data-slot="space-title"
      class="flex min-w-0 flex-1 items-center gap-2 border-b border-sidebar-border px-2 md:w-64 md:flex-none md:shrink-0 md:border-r md:px-4"
    >
      {#if sidebar.isMobile}
        <SidebarTrigger />
      {/if}
      <Icon class="size-4 shrink-0" />
      <h2 class="truncate text-base" title={content.title}>{content.title}</h2>
    </div>
    <div
      data-slot="space-bar"
      class="flex shrink-0 items-center justify-between gap-3 border-b border-sidebar-border px-2 md:min-w-0 md:flex-1 md:shrink md:px-8"
    >
      {#if Bar}
        <Bar />
      {/if}
    </div>
  </header>
  <div class="flex min-h-0 flex-1">
    {#if sidebar.isMobile}
      <AppSidebar config={sheetConfig} />
    {:else}
      <div
        data-slot="space-nav"
        class="flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-second-sidebar pb-2"
      >
        <SecondSidebar
          untitled
          {content}
          pathname={routePathname()}
          {ready}
          {badges}
          onOpenPage={openPage}
          class="min-h-0 flex-1 border-r-0 pb-0"
        />
        {#if footers.length > 0}
          <div class="flex flex-col gap-2 border-t border-sidebar-border px-3 pt-2">
            {#each footers as Footer, index (index)}
              <Footer />
            {/each}
          </div>
        {/if}
      </div>
    {/if}
    <SidebarInset class="flex min-w-0 flex-1 flex-col bg-background">
      {@render children()}
    </SidebarInset>
  </div>
</div>
