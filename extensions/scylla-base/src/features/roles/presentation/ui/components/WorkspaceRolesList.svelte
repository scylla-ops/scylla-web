<script lang="ts">
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import { createQuery, navigateTo, routePathname } from '@scylla/core-sdk';
  import { ListSkeleton } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
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
  <div class="relative overflow-x-auto">
    <table class="w-full min-w-[720px] border-collapse text-sm">
      <thead>
        <tr class="border-t text-left text-xs text-muted-foreground">
          <th class="px-6 py-3 font-medium">{t(rolesMessages.role)}</th>
          <th class="w-36 px-3 py-3 font-medium">{t(rolesMessages.level)}</th>
          <th class="w-28 px-3 py-3 font-medium">{t(rolesMessages.type)}</th>
          <th class="w-20 px-3 py-3 font-medium">{t(rolesMessages.holders)}</th>
          <th class="w-32 px-3 py-3 font-medium">{t(rolesMessages.permissions)}</th>
          <th class="w-10"></th>
        </tr>
      </thead>
      <tbody>
        {#each list as role (role.key)}
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
    </table>
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
