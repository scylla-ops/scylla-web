<script module lang="ts">
  import KeyIcon from '@lucide/svelte/icons/key-round';
  import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
  import SettingsIcon from '@lucide/svelte/icons/settings';
  import WorkflowIcon from '@lucide/svelte/icons/workflow';
  import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarRail,
  } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const LINKS = [
    { label: 'Dashboard', icon: LayoutDashboardIcon, active: true },
    { label: 'Pipelines', icon: WorkflowIcon, active: false },
    { label: 'Secrets', icon: KeyIcon, active: false },
  ];

  const { Story } = defineMeta({
    title: 'Primitives/Sidebar',
    component: Sidebar,
    subcomponents: {
      SidebarProvider,
      SidebarContent,
      SidebarGroup,
      SidebarGroupLabel,
      SidebarMenu,
      SidebarMenuItem,
      SidebarMenuButton,
      SidebarFooter,
      SidebarRail,
      SidebarInset,
    },
  });
</script>

{#snippet menu()}
  <SidebarContent>
    <SidebarGroup>
      <SidebarGroupLabel>Project</SidebarGroupLabel>
      <SidebarMenu>
        {#each LINKS as link (link.label)}
          <SidebarMenuItem>
            <SidebarMenuButton isActive={link.active} tooltip={link.label}>
              <link.icon />
              <span>{link.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        {/each}
        <SidebarMenuItem>
          <SidebarMenuButton disabled><SettingsIcon /><span>Settings</span></SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  </SidebarContent>
  <SidebarFooter>
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg"><span>Ada Lovelace</span></SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarFooter>
{/snippet}

<Story name="In the frame" asChild parameters={{ layout: 'fullscreen' }}>
  <SidebarProvider>
    <Sidebar collapsible="icon">
      {@render menu()}
      <SidebarRail label="Toggle the sidebar" />
    </Sidebar>
    <SidebarInset>
      <div class="p-6 text-sm text-muted-foreground">
        Click the edge of the sidebar, or press Ctrl+B, to fold it to icons.
      </div>
    </SidebarInset>
  </SidebarProvider>
</Story>

<Story name="Not collapsible" asChild>
  <SidebarProvider class="min-h-0">
    <div class="h-80 overflow-hidden rounded-xl border">
      <Sidebar collapsible="none">{@render menu()}</Sidebar>
    </div>
  </SidebarProvider>
</Story>

<Story name="Menu button sizes" asChild>
  <SidebarProvider class="min-h-0">
    <div class="w-64 rounded-xl border bg-sidebar p-2">
      <SidebarMenu>
        <SidebarMenuItem><SidebarMenuButton size="sm"><KeyIcon /><span>sm</span></SidebarMenuButton></SidebarMenuItem>
        <SidebarMenuItem><SidebarMenuButton><KeyIcon /><span>default</span></SidebarMenuButton></SidebarMenuItem>
        <SidebarMenuItem><SidebarMenuButton size="lg"><KeyIcon /><span>lg</span></SidebarMenuButton></SidebarMenuItem>
        <SidebarMenuItem><SidebarMenuButton variant="outline"><KeyIcon /><span>outline</span></SidebarMenuButton></SidebarMenuItem>
        <SidebarMenuItem><SidebarMenuButton isActive><KeyIcon /><span>active</span></SidebarMenuButton></SidebarMenuItem>
      </SidebarMenu>
    </div>
  </SidebarProvider>
</Story>
