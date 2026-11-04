<script lang="ts">
  import Building2Icon from '@lucide/svelte/icons/building-2';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import { can, Permission } from '@platform/authz';
  import { contextStore } from '@platform/context';
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    getSidebar,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
  } from '@scylla/ui/primitives';
  import { toRune } from '@scylla/ui/stores';
  import { t } from '@scylla/ui/i18n';
  import { loadAddWorkspaceDialog, loadWorkspaceList } from '@base/features/workspace';
  import { layoutMessages } from '@base/shell/presentation/layout/messages/layout.messages.ts';
  import CurrentContextDisplay from './CurrentContextDisplay.svelte';

  const sidebar = getSidebar();
  const context = toRune(contextStore);
  const workspaceName = $derived(context().workspace.name);
  const canCreate = $derived(can(Permission.CREATE_WORKSPACE));
  const label = $derived(t(layoutMessages.workspace));

  let addOpen = $state(false);
</script>

<SidebarMenu>
  <SidebarMenuItem>
    <DropdownMenu>
      <DropdownMenuTrigger>
        {#snippet child({ props })}
          <SidebarMenuButton
            {...props}
            size="lg"
            class="rounded-lg px-0 transition-colors duration-200 hover:bg-accent focus:outline-none focus:ring-0 focus-visible:ring-0 data-[state=open]:bg-accent"
          >
            <CurrentContextDisplay
              name={workspaceName || t(layoutMessages.selectWorkspace)}
              description={label}
              icon={Building2Icon}
            />
          </SidebarMenuButton>
        {/snippet}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        class="min-w-56 rounded-xl border-border shadow-lg"
        align="start"
        side={sidebar.isMobile ? 'bottom' : 'right'}
        sideOffset={4}
      >
        <DropdownMenuLabel
          class="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {label}
        </DropdownMenuLabel>

        {#await loadWorkspaceList() then { default: WorkspaceList }}
          <WorkspaceList row={DropdownMenuItem} />
        {/await}

        {#if canCreate}
          <DropdownMenuSeparator class="bg-border" />
          <DropdownMenuItem
            class="group mx-1 mb-1 cursor-pointer gap-3 rounded-lg p-2 hover:bg-accent"
            onSelect={() => (addOpen = true)}
          >
            <div
              class="flex size-8 items-center justify-center rounded-md border border-border bg-background transition-colors group-hover:border-primary"
            >
              <PlusIcon
                class="size-4 text-muted-foreground transition-colors group-hover:text-primary"
              />
            </div>
            <div class="font-medium text-foreground group-hover:text-primary">
              {t(layoutMessages.createWorkspace)}
            </div>
          </DropdownMenuItem>
        {/if}
      </DropdownMenuContent>
    </DropdownMenu>
  </SidebarMenuItem>
</SidebarMenu>

{#await loadAddWorkspaceDialog() then { default: AddWorkspaceDialog }}
  <AddWorkspaceDialog open={addOpen} setOpen={open => (addOpen = open)} />
{/await}
