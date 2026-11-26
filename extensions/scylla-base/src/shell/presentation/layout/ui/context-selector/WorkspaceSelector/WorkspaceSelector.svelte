<script lang="ts">
  import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import { can, Permission } from '@platform/authz';
  import { contextStore } from '@platform/context';
  import { createQuery } from '@scylla/core-sdk';
  import { EntityIcon, swapIn, swapOut } from '@scylla/ui';
  import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '@scylla/ui/primitives';
  import { toRune } from '@scylla/ui/stores';
  import { t } from '@scylla/ui/i18n';
  import {
    loadAddWorkspaceDialog,
    loadWorkspaceList,
    workspaceIconProps,
    workspaceQueries,
  } from '@base/features/workspace';
  import { layoutMessages } from '@base/shell/presentation/layout/messages/layout.messages.ts';

  const context = toRune(contextStore);
  const workspaceName = $derived(context().workspace.name);
  const mine = createQuery(() => workspaceQueries.mine());
  const icon = $derived(mine.data?.find(item => item.id === context().workspace.id)?.icon);
  const iconKey = $derived(JSON.stringify(icon ?? null));
  const canCreate = $derived(can(Permission.CREATE_WORKSPACE));

  let addOpen = $state(false);
</script>

<DropdownMenu>
  <DropdownMenuTrigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="outline"
        class="h-8 max-w-36 shrink-0 gap-2 rounded-lg px-2.5 data-[state=open]:bg-accent sm:max-w-52"
        data-slot="workspace-switcher"
      >
        <!-- The icon of the workspace; a new one grows in over the old one. -->
        <span class="grid shrink-0 place-items-center">
          {#key iconKey}
            <span class="col-start-1 row-start-1 flex" in:swapIn out:swapOut>
              <EntityIcon {...workspaceIconProps(icon)} size={20} />
            </span>
          {/key}
        </span>
        <span class="min-w-0 truncate">
          {workspaceName || t(layoutMessages.selectWorkspace)}
        </span>
        <ChevronsUpDownIcon class="size-4 shrink-0 text-muted-foreground" />
      </Button>
    {/snippet}
  </DropdownMenuTrigger>

  <DropdownMenuContent
    class="w-60 rounded-xl border-border bg-popover p-1 shadow-lg"
    side="bottom"
    align="end"
    sideOffset={4}
  >
    <DropdownMenuLabel class="px-2 py-1 text-xs font-normal text-muted-foreground">
      {t(layoutMessages.workspaces)}
    </DropdownMenuLabel>

    {#await loadWorkspaceList() then { default: WorkspaceList }}
      <WorkspaceList row={DropdownMenuItem} />
    {/await}

    {#if canCreate}
      <DropdownMenuSeparator class="bg-border" />
      <DropdownMenuItem class="h-7 gap-2 px-2 py-0" onSelect={() => (addOpen = true)}>
        <PlusIcon class="size-4 text-muted-foreground" />
        {t(layoutMessages.createWorkspace)}
      </DropdownMenuItem>
    {/if}
  </DropdownMenuContent>
</DropdownMenu>

{#await loadAddWorkspaceDialog() then { default: AddWorkspaceDialog }}
  <AddWorkspaceDialog open={addOpen} setOpen={open => (addOpen = open)} />
{/await}
