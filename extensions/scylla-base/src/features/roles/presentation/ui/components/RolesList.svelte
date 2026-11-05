<script lang="ts">
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import { createQuery, navigateTo, routePathname } from '@scylla/core-sdk';
  import { ErrorState, ListSkeleton } from '@scylla/ui';
  import RolesLoadError from './RolesLoadError.svelte';
  import { t } from '@scylla/ui/i18n';
  import { Input, ToggleGroup, ToggleGroupItem } from '@scylla/ui/primitives';
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

  const rolesQuery = createQuery(() => roleQueries.list());
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
    <div class="relative overflow-x-auto rounded-xl border bg-card">
      <table class="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr class="text-left text-xs text-muted-foreground">
            <th class="px-6 py-3 font-medium">{t(rolesMessages.role)}</th>
            <th class="w-36 px-3 py-3 font-medium">{t(rolesMessages.level)}</th>
            <th class="w-28 px-3 py-3 font-medium">{t(rolesMessages.type)}</th>
            <th class="w-20 px-3 py-3 font-medium">{t(rolesMessages.holders)}</th>
            <th class="w-32 px-3 py-3 font-medium">{t(rolesMessages.permissions)}</th>
            <th class="w-10"></th>
          </tr>
        </thead>
        {#each groups as group (group.id)}
          <tbody>
            <tr class="border-t bg-muted/60">
              <td colspan="6" class="px-6 py-2 text-xs">
                <span class="font-semibold text-foreground">{t(groupLabels[group.id])}</span>
                <span class="ml-2 text-muted-foreground">{t(groupHints[group.id])}</span>
              </td>
            </tr>
            {#each group.roles as role (role.key)}
              <tr
                class="cursor-pointer border-t transition-colors hover:bg-muted/40"
                onclick={() => open(role.key)}
              >
                <td class="px-6 py-3">
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
                </td>
                <td class="px-3 py-3"><LevelTag level={role.level} /></td>
                <td class="px-3 py-3"><OriginTag builtin={role.builtin} /></td>
                <td class="px-3 py-3 tabular-nums">{role.holderCount}</td>
                <td class="px-3 py-3 text-muted-foreground tabular-nums">
                  {permissionCount(role, catalogQuery.data ?? [])}
                </td>
                <td class="pr-4 text-muted-foreground"><ChevronRightIcon class="size-4" /></td>
              </tr>
            {/each}
          </tbody>
        {/each}
      </table>
    </div>
  {/if}
{/if}
