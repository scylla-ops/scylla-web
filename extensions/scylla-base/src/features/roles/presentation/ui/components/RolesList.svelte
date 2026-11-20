<script lang="ts">
  import { createQuery, navigateTo, routePathname } from '@scylla/core-sdk';
  import { ErrorState, ListSkeleton, SegmentedControl } from '@scylla/ui';
  import RolesLoadError from './RolesLoadError.svelte';
  import { t } from '@scylla/ui/i18n';
  import {
    Input,
    Table,
    TableBody,
    TableCell,
    TableFrame,
    TableRow,
  } from '@scylla/ui/primitives';
  import {
    filterLabels,
    groupHints,
    groupLabels,
    rolesMessages,
  } from '../../messages/roles.messages.ts';
  import {
    groupRoles,
    ROLE_FILTERS,
    sortRoles,
    type RoleFilter,
    type RoleSort,
  } from '../../presenters/roles-list.presenter.ts';
  import { roleName } from '../../role-labels.ts';
  import { canSeeRoleHolders, roleQueries } from '../../roles.queries.ts';
  import RoleRow from './RoleRow.svelte';
  import RolesTableHeader from './RolesTableHeader.svelte';

  const rolesQuery = createQuery(() => ({
    ...roleQueries.list(),
    meta: { showsOwnError: true },
    retry: false,
  }));
  const catalogQuery = createQuery(() => roleQueries.catalog());

  let filter = $state<RoleFilter>('all');
  let search = $state('');
  let sort = $state<RoleSort>('none');

  const areas = $derived(catalogQuery.data ?? []);
  const canSeeHolders = $derived(canSeeRoleHolders());
  const groups = $derived(
    groupRoles(rolesQuery.data ?? [], filter, search).map(group => ({
      ...group,
      roles: sortRoles(group.roles, sort, roleName),
    })),
  );
  const filterOptions = $derived(
    ROLE_FILTERS.map(value => ({ value, label: t(filterLabels[value]) })),
  );

  const open = (key: string) => navigateTo(`${routePathname()}/${encodeURIComponent(key)}`);
</script>

{#if rolesQuery.isLoading || catalogQuery.isLoading}
  <ListSkeleton header rows={8} rowClass="h-14 w-full" />
{:else if rolesQuery.isError}
  <RolesLoadError error={rolesQuery.error} onRetry={() => void rolesQuery.refetch()} />
{:else if catalogQuery.isError}
  <ErrorState message={t(rolesMessages.loadError)} />
{:else}
  <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <SegmentedControl
      value={filter}
      options={filterOptions}
      onChange={next => (filter = next)}
      aria-label={t(rolesMessages.filterLabel)}
    />
    <Input
      class="md:w-64"
      placeholder={t(rolesMessages.search)}
      aria-label={t(rolesMessages.search)}
      value={search}
      oninput={event => (search = event.currentTarget.value)}
    />
  </div>

  {#if groups.length === 0}
    <p class="py-8 text-center text-sm text-muted-foreground">{t(rolesMessages.noMatch)}</p>
  {:else}
    <TableFrame>
      <Table class="min-w-[720px]">
        <RolesTableHeader {sort} onSortChange={next => (sort = next)} />
        {#each groups as group (group.id)}
          <TableBody>
            <TableRow>
              <TableCell class="text-xs whitespace-normal" colspan={4}>
                <span class="font-semibold text-foreground">{t(groupLabels[group.id])}</span>
                <span class="ml-2 text-muted-foreground">{t(groupHints[group.id])}</span>
              </TableCell>
            </TableRow>
            {#each group.roles as role (role.key)}
              <RoleRow {role} {areas} {canSeeHolders} onOpen={open} />
            {/each}
          </TableBody>
        {/each}
      </Table>
    </TableFrame>
  {/if}
{/if}
