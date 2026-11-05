<script lang="ts">
  import InfoIcon from '@lucide/svelte/icons/info';
  import { can, Permission } from '@platform/authz';
  import { scyllaNavigate } from '@platform/context';
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { ConfirmOperationAlertDialog, ErrorState, ListSkeleton } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { Button, Input, ToggleGroup, ToggleGroupItem } from '@scylla/ui/primitives';
  import type { UserEntity } from '@base/features/user/domain/entities/user.entity.ts';
  import { userMessages } from '@base/features/user/presentation/messages/user.messages.ts';
  import { userMutations, userQueries } from '@base/features/user/presentation/user.queries.ts';
  import AddUserDialog from './AddUserDialog/AddUserDialog.svelte';
  import InstanceRolesDialog from './InstanceRolesDialog/InstanceRolesDialog.svelte';
  import { filterUsers, holdsInstanceRole, type UserFilter } from './user-filter.ts';
  import UserTable from './user-table/UserTable.svelte';

  const usersQuery = createQuery(() => userQueries.list());
  const users = $derived(usersQuery.data?.items ?? []);
  const meQuery = createQuery(() => userQueries.me());
  const currentUserId = $derived(meQuery.data?.id);

  const deleteUser = createMutation(() => userMutations.remove());

  let filter = $state<UserFilter>('all');
  let search = $state('');
  let addOpen = $state(false);
  let rolesOf = $state<UserEntity | null>(null);
  let toDelete = $state<UserEntity | null>(null);

  const shown = $derived(filterUsers(users, filter, search));
  const counts = $derived({ all: users.length, roles: users.filter(holdsInstanceRole).length });

  const canCreate = $derived(can(Permission.CREATE_USER));
  const canDelete = $derived(can(Permission.DELETE_USER));
  const canChangeRoles = $derived(can(Permission.MANAGE_SYSTEM_GRANTS));

  const confirmDelete = () => {
    if (toDelete) deleteUser.mutate(toDelete.id, { onSuccess: () => (toDelete = null) });
  };
</script>

{#if usersQuery.isLoading}
  <ListSkeleton header rows={6} rowClass="h-12 w-full" />
{:else if usersQuery.isError}
  <ErrorState message={t(userMessages.loadError)} />
{:else}
  <div class="flex w-full flex-col gap-6">
    <header class="flex items-start justify-between gap-6">
      <div class="flex flex-col gap-2">
        <h1 class="text-3xl font-semibold tracking-tight">{t(userMessages.users)}</h1>
        <p class="max-w-3xl text-sm text-muted-foreground">{t(userMessages.usersHint)}</p>
      </div>
      {#if canCreate}
        <Button onclick={() => (addOpen = true)}>{t(userMessages.addUser)}</Button>
      {/if}
    </header>

    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <ToggleGroup
        type="single"
        value={filter}
        onValueChange={next => {
          if (next) filter = next as UserFilter;
        }}
        aria-label={t(userMessages.filterLabel)}
        class="w-fit rounded-lg bg-muted p-1"
      >
        <ToggleGroupItem
          value="all"
          size="sm"
          class="h-auto gap-1.5 rounded-md px-3 py-1 text-sm font-normal text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground"
        >
          {t(userMessages.filterAll)}
          <span class="tabular-nums">{counts.all}</span>
        </ToggleGroupItem>
        <ToggleGroupItem
          value="roles"
          size="sm"
          class="h-auto gap-1.5 rounded-md px-3 py-1 text-sm font-normal text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground"
        >
          {t(userMessages.filterWithRole)}
          <span class="tabular-nums">{counts.roles}</span>
        </ToggleGroupItem>
      </ToggleGroup>
      <Input
        class="md:w-64"
        placeholder={t(userMessages.searchUsers)}
        aria-label={t(userMessages.searchUsers)}
        value={search}
        oninput={event => (search = event.currentTarget.value)}
      />
    </div>

    <UserTable
      data={shown}
      {canChangeRoles}
      canDelete={user => canDelete && user.id !== currentUserId}
      onChangeRoles={user => (rolesOf = user)}
      onDelete={user => (toDelete = user)}
      onView={user =>
        user.id === currentUserId ? scyllaNavigate.goToAccount() : scyllaNavigate.goToUser(user.id)}
    />

    <aside class="flex gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-4">
      <InfoIcon class="mt-0.5 size-4 shrink-0 text-primary" />
      <div>
        <p class="text-sm font-medium">{t(userMessages.workspaceRolesTitle)}</p>
        <p class="mt-1 text-xs text-muted-foreground">{t(userMessages.workspaceRolesHint)}</p>
      </div>
    </aside>

    <AddUserDialog open={addOpen} setOpen={open => (addOpen = open)} />
    <InstanceRolesDialog user={rolesOf} onClose={() => (rolesOf = null)} />
    <ConfirmOperationAlertDialog
      open={toDelete !== null}
      onOpenChange={open => {
        if (!open) toDelete = null;
      }}
      onContinue={confirmDelete}
      isLoading={deleteUser.isPending}
    />
  </div>
{/if}
