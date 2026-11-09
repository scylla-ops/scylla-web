<script lang="ts">
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import { createQuery, navigateTo } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import { Button } from '@scylla/ui/primitives';
  import type { RoleEntity } from '../../../domain/entities/role.entity.ts';
  import { andMore, holderLabels, holdersTotal, rolesMessages } from '../../messages/roles.messages.ts';
  import { permissionCount, roleDescription, roleName } from '../../role-labels.ts';
  import { roleQueries } from '../../roles.queries.ts';
  import LevelTag from '../components/LevelTag.svelte';
  import OriginTag from '../components/OriginTag.svelte';
  import PermissionTable from '../components/PermissionTable/PermissionTable.svelte';

  interface Props {
    role: RoleEntity;
    listUrl: string;
    /** Absent: this page cannot make a copy. */
    duplicateUrl?: string;
    workspaceId?: string;
    canSeeHolders?: boolean;
  }

  let { role, listUrl, duplicateUrl, workspaceId, canSeeHolders = false }: Props = $props();

  /** The page of the people: the members of a workspace, or the users of the instance. */
  const peopleUrl = $derived(listUrl.replace(/\/roles$/, workspaceId ? '/members' : '/users'));

  const holdersQuery = createQuery(() =>
    roleQueries.holders(role.key, workspaceId, { enabled: canSeeHolders }),
  );
  const shown = $derived((holdersQuery.data?.holders ?? []).slice(0, 5));
  const more = $derived((holdersQuery.data?.total ?? 0) - shown.length);

  const catalogQuery = createQuery(() => roleQueries.catalog());
  const areas = $derived(catalogQuery.data ?? []);
  const selected = $derived(new Set(role.permissions));

  const offeredIn = $derived(
    role.level === 'platform'
      ? t(rolesMessages.theInstance)
      : role.workspaceId
        ? t(rolesMessages.thisWorkspace)
        : t(rolesMessages.everyWorkspace),
  );
</script>

<div class="flex w-full flex-col gap-6 pb-20">
  <button
    type="button"
    class="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    onclick={() => navigateTo(listUrl)}
  >
    <ChevronLeftIcon class="size-4" />
    {t(rolesMessages.back)}
  </button>

  <header class="flex items-start justify-between gap-6">
    <div class="flex flex-col gap-2">
      <h1>{roleName(role)}</h1>
      <div class="flex items-center gap-2">
        <LevelTag level={role.level} />
        <OriginTag builtin={role.builtin} />
      </div>
      <p class="max-w-3xl text-sm text-muted-foreground">{roleDescription(role)}</p>
    </div>
    {#if duplicateUrl}
      <Button variant="outline" onclick={() => navigateTo(duplicateUrl)}>
        {t(rolesMessages.duplicate)}
      </Button>
    {/if}
  </header>

  <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
    <section class="overflow-hidden rounded-2xl border bg-card">
      <div class="p-5">
        <h2>{t(rolesMessages.permissions)}</h2>
        <p class="mt-1 text-xs text-muted-foreground">
          {permissionCount(role, areas)} · {t(rolesMessages.readOnlyHint)}
        </p>
      </div>
      <PermissionTable {areas} level={role.level} holder={role.holder} {selected} />
    </section>

    <aside class="rounded-2xl border bg-card">
      <h2 class="border-b p-5">{t(rolesMessages.about)}</h2>
      <dl class="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 p-5 text-sm">
        <dt class="text-xs text-muted-foreground">{t(rolesMessages.level)}</dt>
        <dd><LevelTag level={role.level} /></dd>
        <dt class="text-xs text-muted-foreground">{t(rolesMessages.holdersLabel)}</dt>
        <dd>{t(holderLabels[role.holder])}</dd>
        <dt class="text-xs text-muted-foreground">{t(rolesMessages.origin)}</dt>
        <dd>{role.builtin ? t(rolesMessages.builtIn) : t(rolesMessages.custom)}</dd>
        <dt class="text-xs text-muted-foreground">{t(rolesMessages.key)}</dt>
        <dd class="truncate font-mono text-xs">{role.key}</dd>
        <dt class="text-xs text-muted-foreground">{t(rolesMessages.offeredIn)}</dt>
        <dd>{offeredIn}</dd>
      </dl>
      {#if canSeeHolders && holdersQuery.data}
        <div class="border-t p-5">
          <h3 class="text-sm">{t(holdersTotal(holdersQuery.data.total))}</h3>
          <ul class="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
            {#each shown as holder (`${holder.actorId}-${holder.scopeId}`)}
              <li class="flex justify-between gap-2">
                <span class="truncate">{holder.displayName}</span>
                {#if holder.scopeKind === 'project'}
                  <span class="truncate text-xs">{holder.scopeName}</span>
                {/if}
              </li>
            {/each}
          </ul>
          {#if more > 0}
            <p class="mt-2 text-xs text-muted-foreground">{t(andMore(more))}</p>
          {/if}
          <button
            type="button"
            class="mt-2 text-xs font-medium text-primary hover:underline"
            onclick={() => navigateTo(peopleUrl)}
          >
            {t(rolesMessages.seeMembers)}
          </button>
        </div>
      {/if}
    </aside>
  </div>
</div>
