<script lang="ts">
  import { routeParams } from '@scylla/core-sdk';
  import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarRail,
    Skeleton,
  } from '@scylla/ui/shadcn';
  import { t } from '@scylla/ui/i18n';
  import { fillPath } from '../../routing/compilation/route-path.ts';
  import LanguageSelector from '../LanguageSelector/LanguageSelector.svelte';
  import { NAV_SECTION_CARD_CLASS, NAV_SECTION_DIVIDER_CLASS } from '../nav-classes.ts';
  import { navSectionsFor } from '../nav-sections.ts';
  import NavMain from '../NavMain.svelte';
  import { mergeParams, type ShellConfig } from '../shell-config.ts';
  import { shellMessages } from '../shell.messages.ts';

  let { config }: { config: ShellConfig } = $props();

  const ready = $derived(config.access?.ready() ?? true);
  const headers = $derived(config.sections.flatMap(section => section.header ?? []));
  const footers = $derived(config.contributions.flatMap(shell => shell.sidebarFooter ?? []));

  const linkParams = $derived(
    mergeParams([routeParams, ...config.contributions.map(shell => shell.linkParams)]),
  );

  const sections = $derived(
    navSectionsFor({
      entries: config.entries,
      sections: config.sections,
      hrefOf: entry => fillPath(entry.pattern, linkParams),
      can: permission => config.access?.can(permission) ?? true,
      translate: t,
    }),
  );
</script>

<Sidebar variant="inset" collapsible="icon">
  <SidebarContent class="gap-3">
    {#if ready}
      <NavMain {sections} contributions={config.contributions} />
    {:else}
      <SidebarGroup class={NAV_SECTION_CARD_CLASS}>
        {#each headers as Header, index (index)}
          <Header />
          <div class={NAV_SECTION_DIVIDER_CLASS}></div>
        {/each}
        <div class="flex flex-col gap-1">
          {#each [0, 1, 2, 3] as index (index)}
            <div
              class="flex h-8 items-center gap-2 px-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
            >
              <Skeleton class="size-4 shrink-0 rounded" />
              <Skeleton class="h-4 flex-1 group-data-[collapsible=icon]:hidden" />
            </div>
          {/each}
        </div>
      </SidebarGroup>
    {/if}
  </SidebarContent>
  <SidebarFooter class="flex flex-col gap-2 p-0">
    <LanguageSelector />
    {#each footers as Footer, index (index)}
      <Footer />
    {/each}
  </SidebarFooter>
  <SidebarRail label={t(shellMessages.toggleSidebar)} />
</Sidebar>
