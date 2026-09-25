<script lang="ts">
  import { SidebarProvider } from '@scylla/ui/shadcn';
  import type { ShellConfig } from '../shell-config.ts';
  import AppSidebar from './AppSidebar.svelte';

  let { config }: { config: ShellConfig } = $props();
</script>

<SidebarProvider>
  <AppSidebar {config} />
</SidebarProvider>
