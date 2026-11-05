<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import { navigateTo } from '@scylla/core-sdk';
  import type { AccessSourceEntity } from '@base/features/access';
  import {
    ACTIONS,
    actionLabels,
    areaLabels,
    permissionLabel,
    type CatalogArea,
    type RoleLevel,
  } from '@base/features/roles';
  import { t } from '@scylla/ui/i18n';
  import {
    effectiveCell,
    membershipMessages,
    openRole,
  } from '../../../messages/membership.messages.ts';
  import { sourceRoleName } from '../../../presenters/member-role-name.ts';

  interface Props {
    areas: readonly CatalogArea[];
    level: RoleLevel;
    scopeId: string;
    scopeName: string;
    sources: ReadonlyMap<string, readonly AccessSourceEntity[]>;
    holder: 'people' | 'apps';
    slug: string;
  }

  let { areas, level, scopeId, scopeName, sources, holder, slug }: Props = $props();

  const shown = $derived(
    areas.filter(
      area =>
        (holder === 'apps' || !area.machine) &&
        (level === 'project' ? area.level === 'project' : area.level !== 'platform'),
    ),
  );

  const cellOf = (area: CatalogArea, action: string) =>
    area.permissions.find(permission => permission.action === action);

  /** The permission of the cell that shows its sources. */
  let open = $state<string | null>(null);
  const openSources = $derived(open ? (sources.get(open) ?? []) : []);

  const isDirect = (id: string) => (sources.get(id) ?? []).some(one => one.scopeId === scopeId);

  const roleUrl = (source: AccessSourceEntity) =>
    `/${slug}/access/roles/${encodeURIComponent(source.roleKey)}`;

  const areaTitle = (area: CatalogArea) =>
    areaLabels[area.id] ? t(areaLabels[area.id].title) : area.id;
  const areaHint = (area: CatalogArea) => (areaLabels[area.id] ? t(areaLabels[area.id].hint) : '');
</script>

<div class="relative overflow-x-auto">
  <table class="w-full min-w-[640px] border-collapse text-sm">
    <thead>
      <tr class="bg-muted/60 text-xs text-muted-foreground">
        <th class="px-4 py-2.5 text-left font-medium">{t(membershipMessages.resource)}</th>
        {#each ACTIONS as action (action)}
          <th class="w-[72px] px-2 py-2.5 text-center font-medium">{t(actionLabels[action])}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each shown as area (area.id)}
        <tr class="border-t">
          <td class="px-4 py-2">
            <span class="block font-medium">{areaTitle(area)}</span>
            <span class="block text-xs text-muted-foreground">{areaHint(area)}</span>
          </td>
          {#each ACTIONS as action (action)}
            {@const permission = cellOf(area, action)}
            <td class="px-2 py-2 text-center align-middle">
              {#if !permission}
                <span class="text-muted-foreground/60" aria-hidden="true">—</span>
              {:else if sources.has(permission.id)}
                <button
                  type="button"
                  class="mx-auto block rounded p-1 hover:bg-muted {open === permission.id
                    ? 'ring-1 ring-primary'
                    : ''}"
                  aria-label={t(effectiveCell(permissionLabel(permission.id, areas), scopeName))}
                  onclick={() => (open = open === permission.id ? null : permission.id)}
                >
                  <CheckIcon
                    class="size-4 {isDirect(permission.id) ? 'text-primary' : 'text-foreground'}"
                  />
                </button>
              {:else}
                <span class="text-muted-foreground/60" title={t(membershipMessages.doesNotHave)}>
                  ·
                </span>
              {/if}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

{#if open}
  <div class="border-t p-4 text-sm" role="status">
    <div class="flex items-center justify-between gap-3">
      <p class="font-medium">{t(effectiveCell(permissionLabel(open, areas), scopeName))}</p>
      <span class="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
        {t(membershipMessages.yes)}
      </span>
    </div>
    <p class="mt-2 text-xs text-muted-foreground">{t(membershipMessages.from)}</p>
    <ul class="mt-1 flex flex-col gap-2">
      {#each openSources as source (`${source.scopeId}-${source.roleKey}`)}
        <li class="flex items-center justify-between gap-3">
          <span class="flex items-center gap-2">
            <span class="rounded-full bg-muted px-2 py-0.5 text-xs">{source.scopeName}</span>
            <span class="font-medium">{sourceRoleName(source)}</span>
          </span>
          {#if source.roleKey !== 'owner'}
            <button
              type="button"
              class="text-xs font-medium text-primary hover:underline"
              onclick={() => navigateTo(roleUrl(source))}
            >
              {t(openRole(sourceRoleName(source)))}
            </button>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
{/if}

<div class="flex flex-wrap gap-5 border-t bg-muted/60 px-4 py-2.5 text-xs text-muted-foreground">
  <span class="flex items-center gap-1.5">
    <CheckIcon class="size-3.5 text-primary" />
    {t(membershipMessages.legendHere)}
  </span>
  <span class="flex items-center gap-1.5">
    <CheckIcon class="size-3.5 text-foreground" />
    {t(membershipMessages.legendAbove)}
  </span>
  <span class="flex items-center gap-1.5">· {t(membershipMessages.doesNotHave)}</span>
  <span class="flex items-center gap-1.5">— {t(membershipMessages.noSuchAction)}</span>
</div>
