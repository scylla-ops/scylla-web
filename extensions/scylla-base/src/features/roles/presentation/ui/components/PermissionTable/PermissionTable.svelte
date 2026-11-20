<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { Checkbox, Tabs, TabsContent, TabsList, TabsTrigger } from '@scylla/ui/primitives';
  import { cn } from '@scylla/ui/utils';
  import type { RoleHolder, RoleLevel } from '../../../../domain/entities/role.entity.ts';
  import type { CatalogArea } from '../../../../domain/structs/catalog.struct.ts';
  import { levelLabels, rolesMessages, scopeHint } from '../../../messages/roles.messages.ts';
  import { LEVEL_TONES } from '../../../presenters/role-level.presenter.ts';
  import { levelTabs, permissionRows } from '../../../presenters/permission-table.presenter.ts';
  import LevelTile from '../LevelTile.svelte';
  import PermissionGrid from './PermissionGrid.svelte';
  import { ALWAYS_ON_CLASS } from './permission-table.ts';

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

  let chosen = $state<RoleLevel | null>(null);

  const tabs = $derived(levelTabs(areas, level, holder, selected));
  const active = $derived(tabs.find(tab => tab.level === chosen) ?? tabs[0]);
</script>

<!-- One tab for each level that the role covers: a level the page cannot change has no tab. -->
{#if active}
  <Tabs value={active.level} onValueChange={value => (chosen = value as RoleLevel)} class="gap-0">
    <TabsList
      aria-label={t(rolesMessages.levelTabs)}
      class="h-auto w-full justify-start gap-1 rounded-none border-b bg-transparent p-0 px-5"
    >
      {#each tabs as tab (tab.level)}
        {@const on = tab.level === active.level}
        <TabsTrigger
          value={tab.level}
          class="relative h-auto flex-none gap-2 rounded-none border-0 pt-2.5 pr-3 pb-3 pl-2.5 text-muted-foreground shadow-none data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none dark:data-[state=active]:bg-transparent"
        >
          <LevelTile level={tab.level} class="size-[22px] rounded-[6px]" />
          {t(levelLabels[tab.level])}
          <span
            class={cn(
              'rounded-full px-[7px] py-px text-xs font-medium tabular-nums',
              on ? [LEVEL_TONES[tab.level].count, 'text-foreground'] : 'bg-muted text-muted-foreground',
            )}
          >
            {tab.count} / {tab.total}
          </span>
          {#if on}
            <span
              aria-hidden="true"
              class={cn('absolute inset-x-0 -bottom-px h-0.5', LEVEL_TONES[tab.level].bar)}
            ></span>
          {/if}
        </TabsTrigger>
      {/each}
    </TabsList>
    {#each tabs as tab (tab.level)}
      {@const hint = scopeHint(tab.level, level)}
      <TabsContent value={tab.level}>
        {#if tab.level === active.level}
          {#if hint}
            <p class="px-5 pt-3 text-xs text-muted-foreground">{t(hint)}</p>
          {/if}
          <div class="relative overflow-x-auto p-1.5">
            <PermissionGrid
              rows={permissionRows(tab.areas, areas, level, selected, held)}
              {areas}
              {level}
              {selected}
              {onChange}
            />
          </div>
        {/if}
      </TabsContent>
    {/each}
  </Tabs>
{/if}
<div class="flex flex-wrap gap-5 border-t px-5 py-3 text-xs text-muted-foreground">
  {#if onChange}
    <span class="flex items-center gap-1.5">
      <Checkbox
        checked
        disabled
        aria-hidden="true"
        tabindex={-1}
        class={cn('size-3.5', ALWAYS_ON_CLASS)}
      />
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
  <span class="flex items-center gap-1.5">
    <span class="h-[1.5px] w-2 bg-input" aria-hidden="true"></span>
    {t(rolesMessages.legendNone)}
  </span>
</div>
