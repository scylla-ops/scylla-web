<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import GripVerticalIcon from '@lucide/svelte/icons/grip-vertical';
  import XIcon from '@lucide/svelte/icons/x';
  import type { LucideIcon } from '@scylla/ui';
  import SearchIcon from '@lucide/svelte/icons/search';
  import Undo2Icon from '@lucide/svelte/icons/undo-2';
  import { Input } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { editorMessages as messages } from '@base/features/dashboard/presentation/messages/editor.messages.ts';
  import {
    DATA,
    searchKinds,
    type KindEntry,
  } from '@base/features/dashboard/presentation/presenters/widget-catalog.presenter.ts';
  import { dashboardEditor } from '@base/features/dashboard/presentation/ui/dashboard-editor.state.svelte.ts';
  import { dashboardView } from '@base/features/dashboard/presentation/ui/dashboard-view.state.svelte.ts';
  import { createDashboards } from '@base/features/dashboard/presentation/ui/dashboards.state.svelte.ts';
  import KindThumb from '../DashboardEditor/KindThumb.svelte';
  import PanelAction from './PanelAction.svelte';

  const dashboards = createDashboards();

  let query = $state('');

  const dashboard = $derived(dashboards.dashboardOf(dashboardEditor.dashboardId));
  const kinds = $derived(searchKinds(query));
  const groups = $derived([
    { title: messages.kinds, items: kinds.filter(item => item.group === 'kinds') },
    { title: messages.dedicated, items: kinds.filter(item => item.group === 'dedicated') },
  ]);
  const changes = $derived(dashboardEditor.changes);

  const save = () => {
    const id = dashboardEditor.dashboardId;
    if (id) dashboards.saveWidgets(id, dashboardEditor.widgets);
    dashboardEditor.stop();
  };

  const press = (event: PointerEvent, item: KindEntry) => {
    const data = item.data[0];
    if (!data || event.button !== 0) return;
    dashboardEditor.press(
      { from: 'palette', data, size: DATA[data].sizes[0], label: t(item.title) },
      event.clientX,
      event.clientY,
    );
  };

  let footerWidth = $state(200);
  const compactCancel = $derived(footerWidth < 196);
  const compactSave = $derived(footerWidth < 150);
</script>

<div class="flex shrink-0 flex-col justify-center px-4 pt-4 pb-3">
  <h2 class="truncate text-base">{t(messages.editDashboard)}</h2>
  {#if dashboard}
    <p class="truncate text-xs text-muted-foreground">{dashboard.name}</p>
  {/if}
</div>

<div class="px-4 pb-2">
  <label class="relative block">
    <SearchIcon class="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
    <Input class="h-8 pl-8 text-sm" placeholder={t(messages.searchWidgets)} aria-label={t(messages.searchWidgets)} bind:value={query} />
  </label>
</div>

<div class="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-3">
  {#each groups as group (group.title.id)}
    {#if group.items.length > 0}
      <p class="px-2 pt-4 pb-2 text-xs text-muted-foreground">{t(group.title)}</p>
      <ul class="flex flex-col gap-1">
        {#each group.items as item (item.kind)}
          {@const ready = item.data.length > 0}
          <li>
            <button
              type="button"
              disabled={!ready}
              title={ready ? t(item.text) : t(messages.soon)}
              class={cn(
                'group/kind relative flex w-full items-center gap-3 rounded-lg border border-transparent p-1 text-left text-sm',
                ready ? 'cursor-grab touch-none hover:border-primary/50 hover:bg-background' : 'opacity-45',
              )}
              onpointerdown={event => press(event, item)}
              onclick={() => {
                if (!dashboardEditor.takeDropClick()) dashboardView.openAdd(item.kind);
              }}
            >
              <KindThumb kind={item.kind} />
              <span class="min-w-0 flex-1 truncate">{t(item.title)}</span>
              {#if ready}
                <GripVerticalIcon class="absolute right-2 size-3.5 text-primary opacity-0 group-hover/kind:opacity-100" aria-hidden="true" />
              {:else}
                <span class="shrink-0 text-[10px] text-muted-foreground">{t(messages.soon)}</span>
              {/if}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  {/each}
</div>

<div class="shrink-0 border-t border-sidebar-border px-4 py-3" bind:clientWidth={footerWidth}>
  <div class="flex items-center justify-between gap-2 pb-3 text-xs text-muted-foreground">
    <span class="min-w-0 truncate">
      {changes === 0
        ? t(messages.noChange)
        : changes === 1
          ? t(messages.oneChangeNotSaved)
          : t(messages.changesNotSaved(changes))}
    </span>
    <button
      type="button"
      class="flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-accent disabled:opacity-40"
      aria-label={t(messages.undo)}
      title={t(messages.undo)}
      disabled={changes === 0}
      onclick={() => dashboardEditor.undo()}
    >
      <Undo2Icon class="size-3.5" aria-hidden="true" />
    </button>
  </div>
  <div class="flex items-center justify-between gap-2">
    <PanelAction
      variant="ghost"
      icon={XIcon as LucideIcon}
      label={t(messages.cancel)}
      compact={compactCancel}
      onclick={() => dashboardEditor.stop()}
    />
    <PanelAction icon={CheckIcon as LucideIcon} label={t(messages.saveLayout)} compact={compactSave} onclick={save} />
  </div>
</div>
