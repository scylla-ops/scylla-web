<script lang="ts">
  import EyeIcon from '@lucide/svelte/icons/eye';
  import { DataTable, IconButton } from '@scylla/ui';
  import { createSelection } from '@scylla/ui/state';
  import { UserIdentity } from '@shared/presentation/ui';
  import { formatDate } from '@shared/utils/date-utils.ts';
  import { t } from '@scylla/ui/i18n';
  import type { UserEntity } from '@base/features/user/domain/entities/user.entity.ts';
  import UserStatusBadge from '@base/features/user/presentation/ui/components/UserStatusBadge.svelte';
  import { userMessages } from '@base/features/user/presentation/ui/user.messages.ts';
  import { userColumns } from './user-columns.ts';

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
    icon={EyeIcon}
    tooltip={t(userMessages.view)}
    onclick={event => {
      event.stopPropagation();
      onView(user.userId);
    }}
  />
{/snippet}

<DataTable
  {columns}
  data={data ?? []}
  onRowClick={row => selection.select(row.original.userId)}
  getRowId={(user, index) => user.userId || index.toString()}
  isRowSelected={user => selection.selectedIds.includes(user.userId)}
  alignRowsCenter
/>
