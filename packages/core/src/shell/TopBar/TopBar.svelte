<script lang="ts">
  import { routePathname, routeShare } from '@scylla/core-sdk';
  import { ShareLinkButton } from '@scylla/ui';
  import { getSidebar } from '@scylla/ui/primitives';
  import { railFor, selectedRailItem } from '../AppSidebar/nav-rail.ts';
  import { reactiveNavSections } from '../AppSidebar/nav-sections.svelte.ts';
  import type { ShellConfig } from '../shell-config.ts';
  import ShellBreadcrumbs from './ShellBreadcrumbs.svelte';
  import SidebarTrigger from './SidebarTrigger.svelte';

  let { config }: { config: ShellConfig } = $props();

  const sidebar = getSidebar();
  const ends = $derived(config.contributions.flatMap(shell => shell.topBarEnd ?? []));
  const share = $derived(routeShare());
  const shareHint = $derived(
    config.contributions.flatMap(shell => (shell.shareHint ? [shell.shareHint] : [])).at(-1),
  );

  const navSections = reactiveNavSections(() => config);
  const section = $derived(selectedRailItem(railFor(navSections()), routePathname()));
  const leading = $derived(
    section?.pages[0] && { label: section.title, pathname: section.pages[0].href },
  );
</script>

<header
  class="flex h-14 shrink-0 flex-row items-center gap-3 border-b border-border px-2 md:h-17 md:px-8"
>
  {#if sidebar.isMobile}
    <SidebarTrigger />
  {/if}
  <div class="min-w-0 flex-1">
    <ShellBreadcrumbs contributions={config.contributions} {leading} />
  </div>
  {#if share}
    <ShareLinkButton url={share === true ? undefined : share.url} hint={shareHint?.()} />
  {/if}
  {#each ends as End, index (index)}
    <End />
  {/each}
</header>
