<script lang="ts">
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import { createQuery, navigateTo, routePathname } from '@scylla/core-sdk';
  import { ErrorState, ListSkeleton } from '@scylla/ui';
  import RolesLoadError from './RolesLoadError.svelte';
  import { t } from '@scylla/ui/i18n';
  import {
    Input,
    Table,
    TableBody,
    TableCell,
    TableFrame,
    TableHead,
    TableHeader,
    TableRow,
    ToggleGroup,
    ToggleGroupItem,
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
    type RoleFilter,
  } from '../../presenters/roles-list.presenter.ts';
  import { permissionCount, roleDescription, roleName } from '../../role-labels.ts';
  import { roleQueries } from '../../roles.queries.ts';
  import LevelTag from './LevelTag.svelte';
  import OriginTag from './OriginTag.svelte';

  const rolesQuery = createQuery(() => ({
    ...roleQueries.list(),
    meta: { showsOwnError: true },
    retry: false,
  }));
  const catalogQuery = createQuery(() => roleQueries.catalog());

  let filter = $state<RoleFilter>('all');
  let search = $state('');

  const groups = $derived(groupRoles(rolesQuery.data ?? [], filter, search));

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
    <ToggleGroup
      type="single"
      value={filter}
      onValueChange={next => {
        if (next) filter = next as RoleFilter;
      }}
      aria-label={t(rolesMessages.filterLabel)}
      class="w-fit rounded-lg bg-muted p-1"
    >
      {#each ROLE_FILTERS as value (value)}
        <ToggleGroupItem
          {value}
          size="sm"
          class="h-auto rounded-md px-3 py-1 text-sm font-normal text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground"
        >
          {t(filterLabels[value])}
        </ToggleGroupItem>
      {/each}
    </ToggleGroup>
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
        <TableHeader>
          <TableRow>
            <TableHead>{t(rolesMessages.role)}</TableHead>
            <TableHead class="w-36">{t(rolesMessages.level)}</TableHead>
            <TableHead class="w-28">{t(rolesMessages.type)}</TableHead>
            <TableHead class="w-20">{t(rolesMessages.holders)}</TableHead>
            <TableHead class="w-32">{t(rolesMessages.permissions)}</TableHead>
            <TableHead class="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        {#each groups as group (group.id)}
          <TableBody>
            <TableRow>
              <TableCell class="text-xs whitespace-normal" colspan={6}>
                <span class="font-semibold text-foreground">{t(groupLabels[group.id])}</span>
                <span class="ml-2 text-muted-foreground">{t(groupHints[group.id])}</span>
              </TableCell>
            </TableRow>
            {#each group.roles as role (role.key)}
              <TableRow
                onclick={() => open(role.key)}
              >
                <TableCell class="whitespace-normal">
                  <button
                    type="button"
                    class="block text-left font-medium text-foreground hover:underline"
                    onclick={event => {
                      event.stopPropagation();
                      open(role.key);
                    }}
                  >
                    {roleName(role)}
                  </button>
                  <span class="mt-0.5 block text-xs text-muted-foreground">
                    {roleDescription(role)}
                  </span>
                </TableCell>
                <TableCell><LevelTag level={role.level} /></TableCell>
                <TableCell><OriginTag builtin={role.builtin} /></TableCell>
                <TableCell class="tabular-nums">{role.holderCount}</TableCell>
                <TableCell class="text-muted-foreground tabular-nums">
                  {permissionCount(role, catalogQuery.data ?? [])}
                </TableCell>
                <TableCell class="text-muted-foreground"><ChevronRightIcon class="size-4" /></TableCell>
              </TableRow>
            {/each}
          </TableBody>
        {/each}
      </Table>
    </TableFrame>
  {/if}
{/if}
