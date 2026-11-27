<script lang="ts">
  import type { Snippet } from 'svelte';
  import { overscrollGlow } from '@scylla/ui';
  import { SidebarInset, SidebarProvider } from '@scylla/ui/primitives';
  import AppSidebar from '../AppSidebar/AppSidebar.svelte';
  import { shellConfig } from '../shell-config.ts';
  import SpaceFrame from '../SpaceFrame/SpaceFrame.svelte';
  import TopBar from '../TopBar/TopBar.svelte';

  /** `space`: the id of the space of the page, from its mount. */
  let { children, space }: { children: Snippet; space?: string } = $props();

  const config = shellConfig();
  const overlays = config.contributions.flatMap(shell => shell.overlays ?? []);
  const bottomInset = Math.max(0, ...config.contributions.map(shell => shell.bottomInset ?? 0));

  const spaceSection = $derived.by(() => {
    const section = config.sections.find(({ id }) => id === space);
    return section?.space ? { ...section, space: section.space } : undefined;
  });
</script>

{#snippet pages()}
  <!--
    A page that fills the view ends above the band of the overlays. The room of the scroll bar is
    kept when the page is shorter than the view: a page that grows (a section that opens, a list
    that loads) does not get narrower and move all its content to the left.
  -->
  <div
    style:--shell-bottom-inset="{bottomInset}px"
    class="relative min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable] px-2 pt-2 pb-[max(0.5rem,var(--shell-bottom-inset))] md:px-8 md:pt-8 md:pb-[max(2rem,var(--shell-bottom-inset))]"
    {@attach overscrollGlow({ edges: 'both', size: 'page' })}
  >
    {@render children()}
  </div>
{/snippet}

<SidebarProvider class="h-svh w-full">
  {#if spaceSection}
    <SpaceFrame {config} section={spaceSection}>
      {@render pages()}
    </SpaceFrame>
  {:else}
    <AppSidebar {config} />
    <SidebarInset class="flex min-w-0 flex-1 flex-col bg-background">
      <TopBar {config} />
      {@render pages()}
    </SidebarInset>
  {/if}
  {#each overlays as Overlay, index (index)}
    <Overlay />
  {/each}
</SidebarProvider>
