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
    Tooltip,
    TooltipContent,
    TooltipTrigger,
  } from '@scylla/ui/primitives';
  import { cn } from '@scylla/ui/utils';
  import {
    ACTIONS,
    togglePermission,
    type CatalogAction,
    type CatalogArea,
  } from '../../../../domain/structs/catalog.struct.ts';
  import {
    actionLabels,
    allOf,
    areaLabels,
    clearTab,
    rolesMessages,
    selectTab,
  } from '../../../messages/roles.messages.ts';
  import {
    cellTitle,
    flipAll,
    markOf,
    openInColumn,
    openInTab,
    type PermissionRow,
  } from '../../../presenters/permission-table.presenter.ts';
  import ActionHead from './ActionHead.svelte';
  import { ALWAYS_ON_CLASS } from './permission-table.ts';

  interface Props {
    rows: readonly PermissionRow[];
    /** The whole catalog: a dependency can be in another area. */
    areas: readonly CatalogArea[];
    selected: ReadonlySet<string>;
    /** Absent: the table only shows. */
    onChange?: (selected: Set<string>) => void;
  }

  let { rows, areas, selected, onChange }: Props = $props();

  let hovered = $state<CatalogAction | null>(null);

  const tabIds = $derived(openInTab(rows));
  const tabMark = $derived(markOf(tabIds, selected));
  const tabTip = $derived(
    t(tabMark === 'all' ? clearTab(tabIds.length) : selectTab(tabIds.length)),
  );

  const flip = (ids: readonly string[]) => onChange?.(flipAll(ids, selected, areas));

  const areaTitle = (area: CatalogArea) =>
    areaLabels[area.id] ? t(areaLabels[area.id].title) : area.id;
  const areaHint = (area: CatalogArea) => (areaLabels[area.id] ? t(areaLabels[area.id].hint) : '');
</script>

{#snippet markBox(ids: readonly string[], label: string, props: Record<string, unknown> = {})}
  {@const mark = markOf(ids, selected)}
  <Checkbox
    {...props}
    checked={mark === 'all'}
    indeterminate={mark === 'some'}
    aria-label={label}
    onCheckedChange={() => flip(ids)}
  />
{/snippet}

<Table class="min-w-[640px]">
  <TableHeader>
    <TableRow>
      <TableHead>
        <span class="flex items-center">
          {#if onChange}
            <span class="flex w-7 shrink-0 items-center">
              {#if tabIds.length > 0}
                <Tooltip>
                  <TooltipTrigger>
                    {#snippet child({ props })}
                      {@render markBox(tabIds, t(rolesMessages.allOnTab), props)}
                    {/snippet}
                  </TooltipTrigger>
                  <TooltipContent>{tabTip}</TooltipContent>
                </Tooltip>
              {/if}
            </span>
          {/if}
          {t(rolesMessages.resource)}
        </span>
      </TableHead>
      {#each ACTIONS as action (action)}
        {@const ids = onChange ? openInColumn(rows, action) : []}
        <ActionHead
          {action}
          mark={ids.length > 0 ? markOf(ids, selected) : undefined}
          onFlip={() => flip(ids)}
          onHover={on => (hovered = on ? action : null)}
        />
      {/each}
    </TableRow>
  </TableHeader>
  <TableBody>
    {#each rows as row (row.area.id)}
      <TableRow>
        <TableCell class="whitespace-normal">
          <span class="flex items-center">
            {#if onChange}
              <span class="flex w-7 shrink-0 items-center">
                {#if row.open.length > 0}
                  {@render markBox(row.open, t(allOf(areaTitle(row.area))))}
                {/if}
              </span>
            {/if}
            <span>
              <span class="block font-medium">{areaTitle(row.area)}</span>
              <span class="block text-xs text-muted-foreground">{areaHint(row.area)}</span>
            </span>
          </span>
        </TableCell>
        {#each row.cells as cell (cell.action)}
          {@const name = `${areaTitle(row.area)} · ${t(actionLabels[cell.action])}`}
          <TableCell class={cn('px-2 text-center', hovered === cell.action && 'bg-primary/6')}>
            {#if cell.kind === 'none'}
              <span class="mx-auto block h-[1.5px] w-2 bg-input" aria-hidden="true"></span>
            {:else if onChange}
              <Checkbox
                checked={cell.checked}
                disabled={cell.kind !== 'open'}
                class={cell.kind === 'always' ? ALWAYS_ON_CLASS : undefined}
                title={cellTitle(cell, areas)}
                aria-label={name}
                onCheckedChange={() => onChange?.(togglePermission(selected, cell.id, areas))}
              />
            {:else if cell.checked}
              <CheckIcon class="mx-auto size-4 text-primary" aria-label={name} />
            {:else}
              <span class="text-muted-foreground/60" title={t(rolesMessages.legendOff)}>·</span>
            {/if}
          </TableCell>
        {/each}
      </TableRow>
    {/each}
  </TableBody>
</Table>
