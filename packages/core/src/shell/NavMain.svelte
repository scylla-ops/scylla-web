<script lang="ts">
  import { navigateTo, routePathname, type ShellContributions } from '@scylla/core-sdk';
  import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
  } from '@scylla/ui/shadcn';
  import { NAV_SECTION_CARD_CLASS, NAV_SECTION_DIVIDER_CLASS } from './nav-classes.ts';
  import type { NavItem, NavSection } from './structs/nav-section.struct.ts';

  interface Props {
    sections: NavSection[];
    contributions: readonly ShellContributions[];
  }

  let { sections, contributions }: Props = $props();

  const pathname = $derived(routePathname());
  const badges = $derived(contributions.flatMap(shell => shell.navBadge ?? []));

  const open = (item: NavItem) => {
    contributions.forEach(shell => shell.onNavOpen?.(item.url));
    navigateTo(item.href);
  };
</script>

{#each sections as section (section.id)}
  <SidebarGroup class={NAV_SECTION_CARD_CLASS}>
    {#if section.header}
      {@const Header = section.header}
      <Header />
      <div class={NAV_SECTION_DIVIDER_CLASS}></div>
    {:else}
      <SidebarGroupLabel class="group-data-[collapsible=icon]:hidden">
        {section.title}
      </SidebarGroupLabel>
    {/if}
    <SidebarMenu>
      {#each section.items as item (item.href)}
        <SidebarMenuItem
          class="transition-all duration-200 hover:scale-105 group-data-[collapsible=icon]:hover:scale-100"
        >
          <SidebarMenuButton
            tooltip={item.title}
            isActive={pathname.startsWith(item.href)}
            onclick={() => open(item)}
          >
            {#if item.icon}
              <item.icon />
            {/if}
            <span>{item.title}</span>
            {#each badges as Badge, index (index)}
              <Badge url={item.url} />
            {/each}
          </SidebarMenuButton>
        </SidebarMenuItem>
      {/each}
    </SidebarMenu>
  </SidebarGroup>
{/each}
