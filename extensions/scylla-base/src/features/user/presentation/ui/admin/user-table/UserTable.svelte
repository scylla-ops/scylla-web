<script lang="ts">
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
  import { DataTable } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import {
    Badge,
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from '@scylla/ui/primitives';
  import { UserIdentity } from '@shared/presentation/ui';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import type { UserEntity } from '@base/features/user/domain/entities/user.entity.ts';
  import { userMessages } from '@base/features/user/presentation/messages/user.messages.ts';
  import { userColumns } from './user-table.columns.ts';

  interface Props {
    data?: UserEntity[];
    canChangeRoles: boolean;
    canDelete: (user: UserEntity) => boolean;
    onChangeRoles: (user: UserEntity) => void;
    onDelete: (user: UserEntity) => void;
    onView: (user: UserEntity) => void;
  }

  let { data, canChangeRoles, canDelete, onChangeRoles, onDelete, onView }: Props = $props();

  const columns = $derived(
    userColumns({
      identity: identityCell,
      roles: rolesCell,
      workspaces: workspacesCell,
      lastSignIn: lastSignInCell,
      actions: actionsCell,
    }),
  );
</script>

{#snippet identityCell(user: UserEntity)}
  <UserIdentity {user} size="sm" class="w-full" />
{/snippet}

{#snippet rolesCell(user: UserEntity)}
  {#if user.instanceRoles?.length}
    <span class="flex flex-wrap gap-1.5">
      {#each user.instanceRoles as role (role.key)}
        <Badge variant="secondary" class="rounded-full font-medium">{role.name}</Badge>
      {/each}
    </span>
  {:else}
    <span class="text-xs text-muted-foreground">{t(userMessages.noInstanceRole)}</span>
  {/if}
{/snippet}

{#snippet workspacesCell(user: UserEntity)}
  <span class="truncate">{user.workspaces?.join(', ')}</span>
{/snippet}

{#snippet lastSignInCell(user: UserEntity)}
  <span class="truncate text-xs text-muted-foreground">
    {user.lastSignInAt ? getRelativeTime(user.lastSignInAt) : t(userMessages.neverSignedIn)}
  </span>
{/snippet}

{#snippet actionsCell(user: UserEntity)}
  <DropdownMenu>
    <DropdownMenuTrigger>
      {#snippet child({ props })}
        <Button
          {...props}
          variant="ghost"
          size="icon"
          class="size-8"
          aria-label={t(userMessages.userActions)}
        >
          <EllipsisIcon class="size-4" />
        </Button>
      {/snippet}
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      {#if canChangeRoles}
        <DropdownMenuItem onclick={() => onChangeRoles(user)}>
          {t(userMessages.changeInstanceRoles)}
        </DropdownMenuItem>
      {/if}
      <DropdownMenuItem onclick={() => onView(user)}>{t(userMessages.openUser)}</DropdownMenuItem>
      {#if canDelete(user)}
        <DropdownMenuItem onclick={() => onDelete(user)}>
          {t(userMessages.deleteUser)}
        </DropdownMenuItem>
      {/if}
    </DropdownMenuContent>
  </DropdownMenu>
{/snippet}

<DataTable
  {columns}
  data={data ?? []}
  getRowId={(user, index) => user.id || index.toString()}
  alignRowsCenter
/>
