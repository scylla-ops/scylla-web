<script lang="ts">
  import { createQuery, navigateTo, routePathname } from '@scylla/core-sdk';
  import { ListSkeleton } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { Table, TableBody } from '@scylla/ui/primitives';
  import type { RoleEntity } from '../../../domain/entities/role.entity.ts';
  import { rolesMessages, workspaceRolesTitle } from '../../messages/roles.messages.ts';
  import { sortRoles, type RoleSort } from '../../presenters/roles-list.presenter.ts';
  import { roleName } from '../../role-labels.ts';
  import { roleQueries } from '../../roles.queries.ts';
  import RoleRow from './RoleRow.svelte';
  import RolesLoadError from './RolesLoadError.svelte';
  import RolesTableHeader from './RolesTableHeader.svelte';

  let { workspaceId, workspaceName }: { workspaceId: string; workspaceName: string } = $props();

  const rolesQuery = createQuery(() => ({
    ...roleQueries.list(workspaceId),
    meta: { showsOwnError: true },
    retry: false,
  }));
  const catalogQuery = createQuery(() => roleQueries.catalog());

  let sort = $state<RoleSort>('none');

  const roles = $derived(rolesQuery.data ?? []);
  const areas = $derived(catalogQuery.data ?? []);
  const own = $derived(
    sortRoles(
      roles.filter(role => role.workspaceId === workspaceId),
      sort,
      roleName,
    ),
  );
  const others = $derived(
    sortRoles(
      roles.filter(role => role.workspaceId !== workspaceId),
      sort,
      roleName,
    ),
  );

  const open = (key: string) => navigateTo(`${routePathname()}/${encodeURIComponent(key)}`);
</script>

{#snippet rows(list: readonly RoleEntity[])}
  <div class="relative overflow-x-auto p-1.5">
    <Table class="min-w-[720px]">
      <RolesTableHeader {sort} onSortChange={next => (sort = next)} />
      <TableBody>
        {#each list as role (role.key)}
          <RoleRow {role} {areas} onOpen={open} />
        {/each}
      </TableBody>
    </Table>
  </div>
{/snippet}

{#if rolesQuery.isLoading || catalogQuery.isLoading}
  <ListSkeleton header rows={8} rowClass="h-14 w-full" />
{:else if rolesQuery.isError}
  <RolesLoadError error={rolesQuery.error} onRetry={() => void rolesQuery.refetch()} />
{:else}
  <section class="overflow-hidden rounded-2xl border bg-card">
    <div class="p-5">
      <h2>{t(workspaceRolesTitle(workspaceName))}</h2>
      <p class="mt-1 text-xs text-muted-foreground">{t(rolesMessages.ownRolesHint)}</p>
    </div>
    {#if own.length > 0}
      {@render rows(own)}
    {:else}
      <div class="border-t p-10 text-center">
        <p class="font-medium">{t(rolesMessages.noCustomRoles)}</p>
        <p class="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">
          {t(rolesMessages.noCustomRolesHint)}
        </p>
      </div>
    {/if}
  </section>

  <section class="overflow-hidden rounded-2xl border bg-card">
    <div class="p-5">
      <h2>{t(rolesMessages.fromInstance)}</h2>
      <p class="mt-1 text-xs text-muted-foreground">{t(rolesMessages.fromInstanceHint)}</p>
    </div>
    {@render rows(others)}
  </section>
{/if}
