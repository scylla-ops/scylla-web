<script lang="ts">
  import { slide } from 'svelte/transition';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import { navigateTo, routePathname, type ShellContributions } from '@scylla/core-sdk';
  import { prefersReducedMotion } from '@scylla/ui';
  import {
    getSidebar,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SIDEBAR_FADE,
  } from '@scylla/ui/primitives';
  import { cn } from '@scylla/ui/utils';
  import { NAV_DANGER_APART_CLASS, NAV_HEADING_CLASS, NAV_SECTION_CARD_CLASS } from './nav-classes.ts';
  import { isNavGroupOpen, toggleNavGroup } from './nav-groups.state.svelte.ts';
  import { sheetSections } from './nav-rail.ts';
  import {
    isNavGroup,
    isNavItemActive,
    type NavItem,
    type NavNode,
    type NavSection,
  } from '../structs/nav-section.struct.ts';

  interface Props {
    sections: NavSection[];
    contributions: readonly ShellContributions[];
  }

  let { sections, contributions }: Props = $props();

  const FOLD_MS = 200;

  const sidebar = getSidebar();

  const pathname = $derived(routePathname());
  const badges = $derived(contributions.flatMap(shell => shell.navBadge ?? []));

  const isActive = (item: NavItem) => isNavItemActive(item, pathname);

  const open = (item: NavItem) => {
    contributions.forEach(shell => shell.onNavOpen?.(item.url));
    navigateTo(item.href);
    // A link that changes only an in-page param mounts nothing, and the sheet would stay open.
    sidebar.openMobile = false;
  };

  const keyOf = (node: NavNode) => (isNavGroup(node) ? `group:${node.id}` : node.href);
</script>

{#snippet link(item: NavItem, size: 'default' | 'sm')}
  <SidebarMenuButton
    tooltip={item.title}
    isActive={isActive(item)}
    onclick={() => open(item)}
    data-nav-url={item.url}
    class={cn(
      item.danger &&
        'text-destructive hover:text-destructive active:text-destructive data-[active=true]:text-destructive',
    )}
    {size}
  >
    {#if item.icon}
      <item.icon />
    {/if}
    <span class={SIDEBAR_FADE}>{item.title}</span>
    {#each badges as Badge, index (index)}
      <Badge url={item.url} />
    {/each}
  </SidebarMenuButton>
{/snippet}

{#each sheetSections(sections, pathname) as section (section.id)}
  <SidebarGroup class={NAV_SECTION_CARD_CLASS}>
    <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
    <SidebarMenu>
      {#each section.items as node (keyOf(node))}
        <SidebarMenuItem class={cn(!isNavGroup(node) && node.danger && NAV_DANGER_APART_CLASS)}>
          {#if !isNavGroup(node) && node.heading}
            <p class={NAV_HEADING_CLASS}>{node.heading}</p>
          {/if}
          {#if isNavGroup(node) && node.items.length === 1 && node.items[0]}
            <!-- One page has nothing to fold: the link goes by the name of its group. -->
            {@render link({ ...node.items[0], title: node.title, icon: node.icon }, 'default')}
          {:else if isNavGroup(node)}
            {@const expanded = isNavGroupOpen(node.id)}
            <SidebarMenuButton
              tooltip={node.title}
              isActive={!expanded && node.items.some(isActive)}
              aria-expanded={expanded}
              onclick={() => toggleNavGroup(node.id)}
              data-nav-group={node.id}
            >
              {#if node.icon}
                <node.icon />
              {/if}
              <span class={SIDEBAR_FADE}>{node.title}</span>
              <ChevronRightIcon
                class="ml-auto transition-transform duration-200 group-data-[collapsible=icon]:hidden {expanded
                  ? 'rotate-90'
                  : ''}"
              />
            </SidebarMenuButton>
            {#if expanded}
              <ul
                class="border-sidebar-border mt-1 ml-4 flex flex-col gap-1 border-l pl-2"
                transition:slide={{ duration: prefersReducedMotion() ? 0 : FOLD_MS }}
              >
                {#each node.items as item (item.href)}
                  <li>{@render link(item, 'sm')}</li>
                {/each}
              </ul>
            {/if}
          {:else}
            {@render link(node, 'default')}
          {/if}
        </SidebarMenuItem>
      {/each}
    </SidebarMenu>
  </SidebarGroup>
{/each}
