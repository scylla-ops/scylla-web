<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import { t } from '@scylla/ui/i18n';
  import { Checkbox } from '@scylla/ui/primitives';
  import type { RoleHolder, RoleLevel } from '../../../domain/entities/role.entity.ts';
  import {
    ACTIONS,
    canHoldArea,
    togglePermission,
    type CatalogArea,
    type CatalogPermission,
  } from '../../../domain/structs/catalog.struct.ts';
  import {
    actionLabels,
    areaLabels,
    levelLabels,
    rolesMessages,
    sectionHints,
  } from '../../messages/roles.messages.ts';
  import LevelTag from './LevelTag.svelte';

  interface Props {
    areas: readonly CatalogArea[];
    level: RoleLevel;
    holder: RoleHolder;
    selected: ReadonlySet<string>;
    /** Absent: the table only shows. */
    onChange?: (selected: Set<string>) => void;
  }

  let { areas, level, holder, selected, onChange }: Props = $props();

  const SECTIONS: readonly { level: RoleLevel; machine: boolean }[] = [
    { level: 'platform', machine: false },
    { level: 'workspace', machine: false },
    { level: 'project', machine: false },
    { level: 'workspace', machine: true },
  ];

  const sections = $derived(
    SECTIONS.filter(section => !section.machine || holder === 'apps').map(section => {
      const inSection = areas.filter(
        area => area.level === section.level && area.machine === section.machine,
      );
      const open = inSection.some(area => canHoldArea(area, level, holder));
      return { ...section, areas: inSection, open };
    }),
  );

  const cellOf = (area: CatalogArea, action: string): CatalogPermission | undefined =>
    area.permissions.find(permission => permission.action === action);

  const isLocked = (area: CatalogArea, permission: CatalogPermission) =>
    permission.implicit && area.level === level;

  const selectAll = (inSection: readonly CatalogArea[]) => {
    let next = new Set(selected);
    for (const permission of inSection.flatMap(area => area.permissions)) {
      if (!next.has(permission.id)) next = togglePermission(next, permission.id, areas);
    }
    onChange?.(next);
  };

  const areaTitle = (area: CatalogArea) =>
    areaLabels[area.id] ? t(areaLabels[area.id].title) : area.id;
  const areaHint = (area: CatalogArea) => (areaLabels[area.id] ? t(areaLabels[area.id].hint) : '');
</script>

<table class="w-full min-w-[640px] border-collapse text-sm">
  <thead>
    <tr class="bg-muted/60 text-xs text-muted-foreground">
      <th class="px-4 py-2.5 text-left font-medium">{t(rolesMessages.resource)}</th>
      {#each ACTIONS as action (action)}
        <th class="w-[72px] px-2 py-2.5 text-center font-medium">{t(actionLabels[action])}</th>
      {/each}
    </tr>
  </thead>
  {#each sections as section (`${section.level}-${section.machine}`)}
    <tbody>
      <tr class="border-t">
        <td colspan={ACTIONS.length + 1} class="px-4 py-2.5">
          <div class="flex items-center gap-2.5">
            <LevelTag level={section.level} />
            <span class="text-xs text-muted-foreground">
              {section.open
                ? t(sectionHints[section.level])
                : `${t(rolesMessages.notInLevel)} · ${t(levelLabels[level])}`}
            </span>
            {#if section.open && onChange}
              <button
                type="button"
                class="ml-auto text-xs font-medium text-primary hover:underline"
                onclick={() => selectAll(section.areas)}
              >
                {t(rolesMessages.selectAll)}
              </button>
            {/if}
          </div>
        </td>
      </tr>
      {#if section.open}
        {#each section.areas as area (area.id)}
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
                {:else if onChange}
                  <Checkbox
                    checked={selected.has(permission.id)}
                    disabled={isLocked(area, permission)}
                    aria-label={`${areaTitle(area)} · ${t(actionLabels[action])}`}
                    onCheckedChange={() =>
                      onChange?.(togglePermission(selected, permission.id, areas))}
                  />
                {:else if selected.has(permission.id)}
                  <CheckIcon
                    class="mx-auto size-4 text-primary"
                    aria-label={`${areaTitle(area)} · ${t(actionLabels[action])}`}
                  />
                {:else}
                  <span class="text-muted-foreground/60" title={t(rolesMessages.legendOff)}>·</span>
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      {/if}
    </tbody>
  {/each}
</table>
<div class="flex flex-wrap gap-5 border-t bg-muted/60 px-4 py-2.5 text-xs text-muted-foreground">
  {#if onChange}
    <span class="flex items-center gap-1.5">
      <Checkbox checked disabled aria-hidden="true" tabindex={-1} class="size-3.5" />
      {t(rolesMessages.legendOn)}
    </span>
  {:else}
    <span class="flex items-center gap-1.5">· {t(rolesMessages.legendOff)}</span>
  {/if}
  <span class="flex items-center gap-1.5">— {t(rolesMessages.legendNone)}</span>
</div>
