<script lang="ts">
  import Building2Icon from '@lucide/svelte/icons/building-2';
  import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import { can, Permission } from '@platform/authz';
  import { contextStore } from '@platform/context';
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
  import { loadAddWorkspaceDialog, loadWorkspaceList } from '@base/features/workspace';
  import { layoutMessages } from '@base/shell/presentation/layout/messages/layout.messages.ts';

  const context = toRune(contextStore);
  const workspaceName = $derived(context().workspace.name);
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
        <Building2Icon class="size-4 shrink-0" />
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
