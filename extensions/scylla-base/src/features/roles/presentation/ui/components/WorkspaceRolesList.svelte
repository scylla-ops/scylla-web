<script lang="ts">
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import { createQuery, navigateTo, routePathname } from '@scylla/core-sdk';
  import { ListSkeleton } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '@scylla/ui/primitives';
  import type { RoleEntity } from '../../../domain/entities/role.entity.ts';
  import { rolesMessages, workspaceRolesTitle } from '../../messages/roles.messages.ts';
  import { permissionCount, roleDescription, roleName } from '../../role-labels.ts';
  import { roleQueries } from '../../roles.queries.ts';
  import LevelTag from './LevelTag.svelte';
  import OriginTag from './OriginTag.svelte';
  import RolesLoadError from './RolesLoadError.svelte';

  let { workspaceId, workspaceName }: { workspaceId: string; workspaceName: string } = $props();

  const rolesQuery = createQuery(() => ({
    ...roleQueries.list(workspaceId),
    meta: { showsOwnError: true },
    retry: false,
  }));
  const catalogQuery = createQuery(() => roleQueries.catalog());

  const roles = $derived(rolesQuery.data ?? []);
  const own = $derived(roles.filter(role => role.workspaceId === workspaceId));
  const others = $derived(roles.filter(role => role.workspaceId !== workspaceId));

  const open = (key: string) => navigateTo(`${routePathname()}/${encodeURIComponent(key)}`);
</script>

{#snippet rows(list: readonly RoleEntity[])}
  <div class="relative overflow-x-auto p-1.5">
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
      <TableBody>
        {#each list as role (role.key)}
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
