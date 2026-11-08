<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import { t } from '@scylla/ui/i18n';
  import {
    Checkbox,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '@scylla/ui/primitives';
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
    /** What the caller holds. A permission that is not here is locked. Absent: nothing locks. */
    held?: ReadonlySet<string>;
  }

  let { areas, level, holder, selected, onChange, held }: Props = $props();

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

  const isImplicit = (area: CatalogArea, permission: CatalogPermission) =>
    permission.implicit && area.level === level;

  const notHeld = (permission: CatalogPermission) =>
    held !== undefined && !permission.implicit && !held.has(permission.id);

  const isLocked = (area: CatalogArea, permission: CatalogPermission) =>
    isImplicit(area, permission) || (notHeld(permission) && !selected.has(permission.id));

  const selectAll = (inSection: readonly CatalogArea[]) => {
    let next = new Set(selected);
    for (const permission of inSection.flatMap(area => area.permissions)) {
      if (!next.has(permission.id) && !notHeld(permission)) {
        next = togglePermission(next, permission.id, areas);
      }
    }
    onChange?.(next);
  };

  const areaTitle = (area: CatalogArea) =>
    areaLabels[area.id] ? t(areaLabels[area.id].title) : area.id;
  const areaHint = (area: CatalogArea) => (areaLabels[area.id] ? t(areaLabels[area.id].hint) : '');
</script>

<Table class="min-w-[640px]">
  <TableHeader>
    <TableRow>
      <TableHead>{t(rolesMessages.resource)}</TableHead>
      {#each ACTIONS as action (action)}
        <TableHead class="w-[72px] px-2 text-center">{t(actionLabels[action])}</TableHead>
      {/each}
    </TableRow>
  </TableHeader>
  {#each sections as section (`${section.level}-${section.machine}`)}
    <TableBody>
      <TableRow>
        <TableCell colspan={ACTIONS.length + 1} class="whitespace-normal">
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
        </TableCell>
      </TableRow>
      {#if section.open}
        {#each section.areas as area (area.id)}
          <TableRow>
            <TableCell class="whitespace-normal">
              <span class="block font-medium">{areaTitle(area)}</span>
              <span class="block text-xs text-muted-foreground">{areaHint(area)}</span>
            </TableCell>
            {#each ACTIONS as action (action)}
              {@const permission = cellOf(area, action)}
              <TableCell class="px-2 text-center">
                {#if !permission}
                  <span class="text-muted-foreground/60" aria-hidden="true">—</span>
                {:else if onChange}
                  <Checkbox
                    checked={selected.has(permission.id)}
                    disabled={isLocked(area, permission)}
                    title={notHeld(permission) ? t(rolesMessages.lockedCell) : undefined}
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
              </TableCell>
            {/each}
          </TableRow>
        {/each}
      {/if}
    </TableBody>
  {/each}
</Table>
<div class="flex flex-wrap gap-5 border-t bg-muted/60 px-4 py-2.5 text-xs text-muted-foreground">
  {#if onChange}
    <span class="flex items-center gap-1.5">
      <Checkbox checked disabled aria-hidden="true" tabindex={-1} class="size-3.5" />
      {t(rolesMessages.legendOn)}
    </span>
  {:else}
    <span class="flex items-center gap-1.5">· {t(rolesMessages.legendOff)}</span>
  {/if}
  {#if onChange && held}
    <span class="flex items-center gap-1.5">
      <Checkbox disabled aria-hidden="true" tabindex={-1} class="size-3.5" />
      {t(rolesMessages.lockedCell)}
    </span>
  {/if}
  <span class="flex items-center gap-1.5">— {t(rolesMessages.legendNone)}</span>
</div>
