<script lang="ts">
  import type { Snippet } from 'svelte';
  import { SidebarInset, SidebarProvider } from '@scylla/ui/shadcn';
  import AppSidebar from '../AppSidebar/AppSidebar.svelte';
  import { shellConfig } from '../shell-config.ts';
  import TopBar from '../TopBar.svelte';

  let { children }: { children: Snippet } = $props();

  const config = shellConfig();
  const overlays = config.contributions.flatMap(shell => shell.overlays ?? []);
</script>

<SidebarProvider class="h-svh w-full">
  <AppSidebar {config} />
  <SidebarInset class="flex min-w-0 flex-1 flex-col border border-sidebar-border bg-background p-2">
    <TopBar contributions={config.contributions} />
    <div class="min-h-0 flex-1 overflow-y-auto p-2">
      {@render children()}
    </div>
  </SidebarInset>
  {#each overlays as Overlay, index (index)}
    <Overlay />
  {/each}
</SidebarProvider>
