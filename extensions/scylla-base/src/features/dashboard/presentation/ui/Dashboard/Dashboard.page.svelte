<script lang="ts">
  import PlusIcon from '@lucide/svelte/icons/plus';
  import { onDestroy } from 'svelte';
  import { scyllaNavigate } from '@platform/context';
  import { routeParams } from '@scylla/core-sdk';
  import { WidgetGrid, widgetSpanStyle } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { LayoutWidget } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
  import { dashboardMessages } from '@base/features/dashboard/presentation/messages/dashboard.messages.ts';
  import { editorMessages } from '@base/features/dashboard/presentation/messages/editor.messages.ts';
  import { dashboardPath } from '@base/features/dashboard/presentation/presenters/dashboard-paths.presenter.ts';
  import {
    cellsText,
    DATA,
  } from '@base/features/dashboard/presentation/presenters/widget-catalog.presenter.ts';
  import { dashboardEditor } from '@base/features/dashboard/presentation/ui/dashboard-editor.state.svelte.ts';
  import { createDashboardPeriod } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
  import { dashboardView } from '@base/features/dashboard/presentation/ui/dashboard-view.state.svelte.ts';
  import { createDashboards } from '@base/features/dashboard/presentation/ui/dashboards.state.svelte.ts';
  import { createDashboardWidgets } from '@base/features/dashboard/presentation/ui/widgets/dashboard-widgets.state.svelte.ts';
  import AddWidgetDialog from '../DashboardEditor/AddWidgetDialog.svelte';
  import DashboardWidget from '../DashboardEditor/DashboardWidget.svelte';
  import EditableWidget from '../DashboardEditor/EditableWidget.svelte';
  import NewDashboardDialog from '../DashboardEditor/NewDashboardDialog.svelte';
  import WidgetDrawer from '../DashboardEditor/WidgetDrawer.svelte';

  const period = createDashboardPeriod();
  const widgets = createDashboardWidgets(period, () => dashboardView.projectId);
  const dashboards = createDashboards();
  onDestroy(dashboardView.attach(period));
  onDestroy(() => dashboardEditor.stop());

  const routeId = $derived(routeParams().dashboardId ?? null);
  const dashboard = $derived(dashboards.dashboardOf(routeId));
  const editing = $derived(dashboardEditor.active && dashboardEditor.dashboardId === dashboard?.id);
  const items = $derived<readonly LayoutWidget[]>(editing ? dashboardEditor.widgets : (dashboard?.widgets ?? []));
  const drag = $derived(dashboardEditor.drag);
  const over = $derived(dashboardEditor.over);

  let drawerId = $state<string | null>(null);
  const drawerItem = $derived(items.find(item => item.id === drawerId) ?? null);

  const titleOf = (item: LayoutWidget) => t(DATA[item.data].title);

  $effect(() => {
    if (dashboards.loaded && !dashboardEditor.active && routeId !== null && !dashboard) {
      scyllaNavigate.goToWorkspaceRoute('/dashboard', { replace: true });
    }
  });

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    dashboardEditor.drop();
  };

  const onGridDragOver = (event: DragEvent) => {
    if (!drag) return;
    event.preventDefault();
    if (event.target === event.currentTarget) dashboardEditor.dragOver(items.length);
  };
</script>

{#snippet placeholder()}
  {#if drag}
    <div
      data-slot="drop-here"
      role="presentation"
      style={widgetSpanStyle(drag.size)}
      class="col-span-(--widget-columns) row-span-(--widget-rows) flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-primary/60 bg-primary/10 text-center @3xl:col-span-(--widget-columns-wide) @3xl:row-span-(--widget-rows-wide)"
      ondragover={event => event.preventDefault()}
    >
      <span class="text-sm text-primary">{t(editorMessages.dropHere)}</span>
      <span class="text-xs text-muted-foreground">{t(editorMessages.dropHint(cellsText(drag.size)))}</span>
    </div>
  {/if}
{/snippet}

<div class="flex w-full flex-col" data-editing={editing || undefined}>
  <h1 class="sr-only">{t(dashboardMessages.dashboard)}</h1>

  {#if dashboard && items.length === 0 && !editing}
    <div class="flex flex-col items-center gap-1 rounded-2xl border border-dashed border-border px-4 py-16 text-center">
      <p class="text-sm">{t(editorMessages.emptyDashboard)}</p>
      <p class="text-sm text-muted-foreground">{t(editorMessages.emptyDashboardHint)}</p>
    </div>
  {:else if dashboard}
    <WidgetGrid aria-label={dashboard.name} class={cn(editing && 'pt-3')}>
      {#if editing}
        {#each items as item, index (item.id)}
          {#if over === index}{@render placeholder()}{/if}
          <EditableWidget {item} {index} title={titleOf(item)} onOpenData={() => (drawerId = item.id)}>
            <DashboardWidget {item} {widgets} {period} />
          </EditableWidget>
        {/each}
        {#if over === items.length}{@render placeholder()}{/if}
        <div
          role="presentation"
          class="relative col-span-full row-span-1 grid grid-cols-8 gap-(--widget-grid-gap-wide)"
          ondragover={onGridDragOver}
          ondrop={onDrop}
        >
          {#each { length: 8 } as _, index (index)}
            <span class="rounded-xl bg-muted/50" aria-hidden="true"></span>
          {/each}
          <button
            type="button"
            class="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            onclick={() => dashboardView.openAdd('ratio')}
          >
            <PlusIcon class="size-4" aria-hidden="true" />
            {t(editorMessages.addOrDrop)}
          </button>
        </div>
      {:else}
        {#each items as item (item.id)}
          <DashboardWidget {item} {widgets} {period} />
        {/each}
      {/if}
    </WidgetGrid>
  {/if}
</div>

<svelte:window
  ondrop={event => {
    if (editing && drag) onDrop(event);
  }}
  ondragover={event => {
    if (editing && drag) event.preventDefault();
  }}
/>

{#if dashboardView.adding && editing}
  <AddWidgetDialog
    kind={dashboardView.adding.kind}
    {widgets}
    {period}
    onAdd={(data, size) => {
      dashboardEditor.add(data, size);
      dashboardView.closeAdd();
    }}
    onClose={() => dashboardView.closeAdd()}
  />
{/if}

{#if drawerItem && editing}
  <WidgetDrawer
    item={drawerItem}
    {widgets}
    {period}
    onApply={change => {
      dashboardEditor.update(drawerItem.id, change);
      drawerId = null;
    }}
    onRemove={() => {
      dashboardEditor.remove(drawerItem.id);
      drawerId = null;
    }}
    onClose={() => (drawerId = null)}
  />
{/if}

{#if dashboardView.creating}
  <NewDashboardDialog
    current={dashboard ? { id: dashboard.id, name: dashboard.name } : null}
    onCreate={(name, start, makeDefault) => {
      const created = dashboards.create(name, start, makeDefault);
      dashboardView.setCreating(false);
      dashboardEditor.start(created.id, created.widgets);
      scyllaNavigate.goToWorkspaceRoute(`/${dashboardPath(created.id, makeDefault)}`);
    }}
    onClose={() => dashboardView.setCreating(false)}
  />
{/if}
