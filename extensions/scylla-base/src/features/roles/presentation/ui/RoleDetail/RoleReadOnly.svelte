<script lang="ts">
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import { createQuery, navigateTo } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import { Button } from '@scylla/ui/primitives';
  import type { RoleEntity } from '../../../domain/entities/role.entity.ts';
  import { holderLabels, rolesMessages } from '../../messages/roles.messages.ts';
  import { permissionCount, roleDescription, roleName } from '../../role-labels.ts';
  import { roleQueries } from '../../roles.queries.ts';
  import LevelTag from '../components/LevelTag.svelte';
  import OriginTag from '../components/OriginTag.svelte';
  import PermissionTable from '../components/PermissionTable.svelte';

  interface Props {
    role: RoleEntity;
    listUrl: string;
    /** Absent: this page cannot make a copy. */
    duplicateUrl?: string;
  }

  let { role, listUrl, duplicateUrl }: Props = $props();

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

<div class="flex w-full flex-col gap-6">
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
      <h1 class="text-3xl font-semibold tracking-tight">{roleName(role)}</h1>
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
        <h2 class="font-semibold">{t(rolesMessages.permissions)}</h2>
        <p class="mt-1 text-xs text-muted-foreground">
          {permissionCount(role, areas)} · {t(rolesMessages.readOnlyHint)}
        </p>
      </div>
      <div class="overflow-x-auto">
        <PermissionTable {areas} level={role.level} holder={role.holder} {selected} />
      </div>
    </section>

    <aside class="rounded-2xl border bg-card">
      <h2 class="border-b p-5 font-semibold">{t(rolesMessages.about)}</h2>
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
    </aside>
  </div>
</div>
