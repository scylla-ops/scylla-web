<script lang="ts">
  import PencilIcon from '@lucide/svelte/icons/pencil';
  import { DataTable, IconButton } from '@scylla/ui';
  import { createSelection } from '@scylla/ui/state';
  import { UserIdentity } from '@shared/presentation/ui';
  import { formatDate } from '@shared/utils/date-utils.ts';
  import { t } from '@scylla/ui/i18n';
  import type { UserEntity } from '@base/features/user/domain/entities/user.entity.ts';
  import UserStatusBadge from '@base/features/user/presentation/ui/components/UserStatusBadge.svelte';
  import { userMessages } from '@base/features/user/presentation/messages/user.messages.ts';
  import { userColumns } from './user-table.columns.ts';

  interface Props {
    data?: UserEntity[];
    onView: (userId: string) => void;
  }

  let { data, onView }: Props = $props();

  const selection = createSelection('users');

  const columns = $derived(
    userColumns({
      identity: identityCell,
      status: statusCell,
      creationDate: createdCell,
      actions: actionsCell,
    }),
  );
</script>

{#snippet identityCell(user: UserEntity)}
  <UserIdentity {user} size="sm" class="w-full" />
{/snippet}

{#snippet statusCell(user: UserEntity)}
  <UserStatusBadge isActive={user.isActive} />
{/snippet}

{#snippet createdCell(user: UserEntity)}
  <span class="truncate">{formatDate(user.createdAt)}</span>
{/snippet}

{#snippet actionsCell(user: UserEntity)}
  <IconButton
    icon={PencilIcon}
    tooltip={t(userMessages.edit)}
    onclick={event => {
      event.stopPropagation();
      onView(user.id);
    }}
  />
{/snippet}

<DataTable
  {columns}
  data={data ?? []}
  onRowClick={row => selection.select(row.original.id)}
  getRowId={(user, index) => user.id || index.toString()}
  isRowSelected={user => selection.selectedIds.includes(user.id)}
  alignRowsCenter
/>
