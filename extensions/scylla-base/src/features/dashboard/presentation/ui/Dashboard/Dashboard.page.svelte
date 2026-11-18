<script lang="ts">
  import PlusIcon from '@lucide/svelte/icons/plus';
  import { onDestroy } from 'svelte';
  import { scyllaNavigate } from '@platform/context';
  import { guardLeave, routeParams } from '@scylla/core-sdk';
  import { ConfirmOperationAlertDialog, WidgetGrid } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { LayoutSize, LayoutWidget } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
  import { dashboardMessages } from '@base/features/dashboard/presentation/messages/dashboard.messages.ts';
  import { editorMessages } from '@base/features/dashboard/presentation/messages/editor.messages.ts';
  import { dashboardPath } from '@base/features/dashboard/presentation/presenters/dashboard-paths.presenter.ts';
  import {
    DATA,
    SIZE_CELLS,
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
  import { dropIndexAt, type DropSlot } from '@base/features/dashboard/presentation/presenters/drop-target.presenter.ts';
  import MobileBar from './MobileBar.svelte';

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
  let drawerOpen = $state(false);
  const drawerItem = $derived(items.find(item => item.id === drawerId) ?? null);
  const openDrawer = (id: string) => {
    drawerId = id;
    drawerOpen = true;
  };

  let gridArea = $state<HTMLElement | null>(null);
  let leaving = $state<(() => void) | null>(null);
  const unsaved = $derived(editing && dashboardEditor.changes > 0);
  const AREA_MARGIN_PX = 24;
  /** A press in these keeps the selection: the widget and its toolbar, the drawer, a dialog or a menu. */
  const KEEPS_SELECTION =
    '[data-slot="editable-widget"], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [data-slot$="overlay"], [data-slot$="-content"]';
  const GRID_COLUMNS = 8;
  const GRID_GAP_PX = 16;
  const GRID_ROW_PX = 98;

  /** The size in px of a widget of `size` on the grid of the page: the ghost of a drag has it. */
  const ghostBox = (size: LayoutSize) => {
    const width = gridArea?.clientWidth ?? 1104;
    const column = (width - GRID_GAP_PX * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
    const cells = SIZE_CELLS[size];
    return {
      width: cells.columns * column + (cells.columns - 1) * GRID_GAP_PX,
      height: cells.rows * GRID_ROW_PX + (cells.rows - 1) * GRID_GAP_PX,
    };
  };

  const titleOf = (item: LayoutWidget) => t(DATA[item.data].title);

  $effect(() => {
    if (dashboards.loaded && !dashboardEditor.active && routeId !== null && !dashboard) {
      scyllaNavigate.goToWorkspaceRoute('/dashboard', { replace: true });
    }
  });

  $effect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    const stop = guardLeave(leave => {
      leaving = leave;
      return true;
    });
    return () => {
      stop();
      window.removeEventListener('beforeunload', warn);
    };
  });

  const discardAndLeave = () => {
    const leave = leaving;
    leaving = null;
    dashboardEditor.stop();
    leave?.();
  };

  /** The index under the pointer: every slot of the grid counts whole, the end row too. */
  const indexAt = (x: number, y: number): number | null => {
    if (!gridArea) return null;
    const slots: DropSlot[] = [...gridArea.querySelectorAll<HTMLElement>('[data-drop-index]')].map(element => {
      const box = element.getBoundingClientRect();
      return { index: Number(element.dataset.dropIndex), left: box.left, top: box.top, right: box.right, bottom: box.bottom };
    });
    const area = gridArea.getBoundingClientRect();
    return dropIndexAt(x, y, slots, {
      left: area.left - AREA_MARGIN_PX,
      top: area.top - AREA_MARGIN_PX,
      right: area.right + AREA_MARGIN_PX,
      bottom: area.bottom + AREA_MARGIN_PX,
    });
  };
</script>


<div class="flex w-full flex-col pb-12" data-editing={editing || undefined}>
  <h1 class="sr-only">{t(dashboardMessages.dashboard)}</h1>

  {#if dashboard}
    <MobileBar {dashboard} {dashboards} {period} {editing} />
  {/if}

  {#if dashboard && items.length === 0 && !editing}
    <div class="flex flex-col items-center gap-1 rounded-2xl border border-dashed border-border px-4 py-16 text-center">
      <p class="text-sm">{t(editorMessages.emptyDashboard)}</p>
      <p class="text-sm text-muted-foreground">{t(editorMessages.emptyDashboardHint)}</p>
    </div>
  {:else if dashboard}
    <div bind:this={gridArea}>
    <WidgetGrid aria-label={dashboard.name} class={cn(editing && 'pt-3')}>
      {#if editing}
        {#each items as item, index (item.id)}
          <EditableWidget {item} {index} title={titleOf(item)} onOpenData={() => openDrawer(item.id)}>
            <DashboardWidget {item} {widgets} {period} />
          </EditableWidget>
        {/each}
        <div
          data-drop-index={items.length}
          class="relative col-span-full row-span-1 grid grid-cols-8 gap-(--widget-grid-gap-wide)"
        >
          {#each { length: 8 } as _, index (index)}
            <span
              class={cn('rounded-xl', drag && over === items.length ? 'border-2 border-dashed border-primary/60 bg-primary/15' : 'bg-muted/50')}
              aria-hidden="true"
            ></span>
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
    </div>
  {/if}
</div>

{#if drag && dashboardEditor.pointer}
  {@const box = ghostBox(drag.size)}
  <div
    data-slot="drag-ghost"
    aria-hidden="true"
    inert
    class="pointer-events-none fixed z-50 flex rotate-[1.5deg] rounded-2xl bg-background opacity-95 shadow-2xl ring-2 ring-primary/70 [&>[data-slot=widget]]:size-full"
    style="left: {dashboardEditor.pointer.x - drag.grab.x}px; top: {dashboardEditor.pointer.y - drag.grab.y}px; width: {box.width}px; height: {box.height}px"
  >
    <DashboardWidget item={{ data: drag.data, size: drag.size }} {widgets} {period} />
  </div>
{/if}

<svelte:window
  onpointermove={event => {
    if (editing) dashboardEditor.move(event.clientX, event.clientY, indexAt(event.clientX, event.clientY));
  }}
  onpointerup={() => {
    if (editing) dashboardEditor.release();
  }}
  onpointercancel={() => dashboardEditor.cancelDrag()}
  onpointerdown={event => {
    if (!editing || !dashboardEditor.selected) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest(KEEPS_SELECTION)) dashboardEditor.select(null);
  }}
  onkeydown={event => {
    if (event.key === 'Escape' && drag) dashboardEditor.cancelDrag();
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
  {#key drawerItem.id}
  <WidgetDrawer
    open={drawerOpen}
    item={drawerItem}
    {widgets}
    {period}
    onApply={change => {
      dashboardEditor.update(drawerItem.id, change);
      drawerOpen = false;
    }}
    onRemove={() => {
      dashboardEditor.remove(drawerItem.id);
      drawerOpen = false;
    }}
    onClose={() => (drawerOpen = false)}
  />
  {/key}
{/if}

<ConfirmOperationAlertDialog
  open={leaving !== null}
  onOpenChange={open => {
    if (!open) leaving = null;
  }}
  onContinue={discardAndLeave}
  title={t(editorMessages.leaveTitle)}
  description={t(editorMessages.leaveText(dashboardEditor.changes))}
  continueLabel={t(editorMessages.discardAndLeave)}
  cancelLabel={t(editorMessages.stay)}
/>

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
