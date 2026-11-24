<script lang="ts">
  import { routePathname } from '@scylla/core-sdk';
  import {
    getSidebar,
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    Skeleton,
  } from '@scylla/ui/primitives';
  import DoubleSidebar from './DoubleSidebar.svelte';
  import { NAV_SECTION_CARD_CLASS } from './nav-classes.ts';
  import { openNavGroupsOnArrival } from './nav-groups.state.svelte.ts';
  import { reactiveNavSections } from './nav-sections.svelte.ts';
  import NavMain from './NavMain.svelte';
  import { mergeParams, type ShellConfig } from '../shell-config.ts';

  let { config }: { config: ShellConfig } = $props();

  const sidebar = getSidebar();

  const ready = $derived(config.access?.ready() ?? true);
  const footers = $derived(config.contributions.flatMap(shell => shell.sidebarFooter ?? []));

  const titleParams = $derived(
    mergeParams(config.contributions.map(shell => shell.breadcrumbParams)),
  );

  const navSections = reactiveNavSections(() => config);
  const sections = $derived(navSections());

  openNavGroupsOnArrival(() => sections, routePathname);
</script>

{#if sidebar.isMobile}
  <Sidebar>
    <SidebarContent class="gap-3 p-2">
      {#if ready}
        <NavMain {sections} contributions={config.contributions} />
      {:else}
        <SidebarGroup class={NAV_SECTION_CARD_CLASS}>
          <div class="flex flex-col gap-1">
            {#each [0, 1, 2, 3] as index (index)}
              <div class="flex h-8 items-center gap-2 px-2">
                <Skeleton class="size-4 shrink-0 rounded" />
                <Skeleton class="h-4 flex-1" />
              </div>
            {/each}
          </div>
        </SidebarGroup>
      {/if}
    </SidebarContent>
    <SidebarFooter class="flex flex-col gap-2 p-2">
      {#each footers as Footer, index (index)}
        <Footer />
      {/each}
    </SidebarFooter>
  </Sidebar>
{:else}
  <DoubleSidebar {sections} params={titleParams} {ready} contributions={config.contributions} />
{/if}
