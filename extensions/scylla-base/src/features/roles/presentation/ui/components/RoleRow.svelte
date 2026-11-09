<script lang="ts">
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import LockIcon from '@lucide/svelte/icons/lock';
  import PencilIcon from '@lucide/svelte/icons/pencil';
  import { t } from '@scylla/ui/i18n';
  import { TableCell, TableRow } from '@scylla/ui/primitives';
  import type { RoleEntity } from '../../../domain/entities/role.entity.ts';
  import type { CatalogArea } from '../../../domain/structs/catalog.struct.ts';
  import { levelLabels, rolesMessages } from '../../messages/roles.messages.ts';
  import { roleDescription, roleName } from '../../role-labels.ts';
  import HolderStack from './HolderStack.svelte';
  import LevelTile from './LevelTile.svelte';
  import RolePermissions from './RolePermissions/RolePermissions.svelte';

  interface Props {
    role: RoleEntity;
    areas: readonly CatalogArea[];
    workspaceId?: string;
    canSeeHolders: boolean;
    onOpen: (key: string) => void;
  }

  let { role, areas, workspaceId, canSeeHolders, onOpen }: Props = $props();

  const description = $derived(roleDescription(role));
</script>

<TableRow onclick={() => onOpen(role.key)}>
  <TableCell class="py-3 whitespace-normal">
    <div class="flex items-center gap-3.5">
      <LevelTile level={role.level} />
      <div class="flex min-w-0 flex-col gap-[3px]">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="text-left font-medium text-foreground hover:underline"
            onclick={event => {
              event.stopPropagation();
              onOpen(role.key);
            }}
          >
            {roleName(role)}
          </button>
          {#if role.builtin}
            <span class="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <LockIcon class="size-3" />
              {t(rolesMessages.builtIn)}
            </span>
          {:else}
            <span
              class="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/14 py-0.5 pr-2 pl-1.5 text-xs font-medium text-primary"
            >
              <PencilIcon class="size-[11px]" />
              {t(rolesMessages.custom)}
            </span>
          {/if}
        </div>
        <div class="flex items-start gap-1.5 text-xs">
          <span class="shrink-0 font-medium text-foreground">{t(levelLabels[role.level])}</span>
          {#if description}
            <span class="text-muted-foreground">·</span>
            <span class="text-muted-foreground">{description}</span>
          {/if}
        </div>
      </div>
    </div>
  </TableCell>
  <TableCell class="py-3 pl-0"><RolePermissions {role} {areas} /></TableCell>
  <TableCell class="py-3 pl-0">
    <HolderStack {role} {workspaceId} {canSeeHolders} />
  </TableCell>
  <TableCell class="py-3 pl-0 text-muted-foreground">
    <ChevronRightIcon class="size-4" />
  </TableCell>
</TableRow>
