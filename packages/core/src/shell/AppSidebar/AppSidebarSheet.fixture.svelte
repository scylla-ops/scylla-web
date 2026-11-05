<script lang="ts">
  import { SidebarProvider } from '@scylla/ui/primitives';
  import type { ShellConfig } from '../shell-config.ts';
  import SidebarTrigger from '../TopBar/SidebarTrigger.svelte';
  import AppSidebar from './AppSidebar.svelte';

  let { config }: { config: ShellConfig } = $props();
</script>

<SidebarProvider>
  <SidebarTrigger />
  <AppSidebar {config} />
</SidebarProvider>
