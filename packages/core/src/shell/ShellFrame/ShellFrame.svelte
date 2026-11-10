<script lang="ts">
  import type { Snippet } from 'svelte';
  import { SidebarInset, SidebarProvider } from '@scylla/ui/primitives';
  import AppSidebar from '../AppSidebar/AppSidebar.svelte';
  import { shellConfig } from '../shell-config.ts';
  import TopBar from '../TopBar/TopBar.svelte';

  let { children }: { children: Snippet } = $props();

  const config = shellConfig();
  const overlays = config.contributions.flatMap(shell => shell.overlays ?? []);
  const bottomInset = Math.max(0, ...config.contributions.map(shell => shell.bottomInset ?? 0));
</script>

<SidebarProvider class="h-svh w-full">
  <AppSidebar {config} />
  <SidebarInset class="flex min-w-0 flex-1 flex-col bg-background">
    <TopBar {config} />
    <!-- A page that fills the view ends above the band of the overlays. -->
    <div
      style:--shell-bottom-inset="{bottomInset}px"
      class="relative min-h-0 flex-1 overflow-y-auto px-2 pt-2 pb-[max(0.5rem,var(--shell-bottom-inset))] md:px-8 md:pt-8 md:pb-[max(2rem,var(--shell-bottom-inset))]"
    >
      {@render children()}
    </div>
  </SidebarInset>
  {#each overlays as Overlay, index (index)}
    <Overlay />
  {/each}
</SidebarProvider>
