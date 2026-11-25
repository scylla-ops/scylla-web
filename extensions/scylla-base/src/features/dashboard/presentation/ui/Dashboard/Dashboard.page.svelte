<script lang="ts">
  import PlusIcon from '@lucide/svelte/icons/plus';
  import { onDestroy } from 'svelte';
  import { scyllaNavigate } from '@platform/context';
  import { guardLeave, routeParams } from '@scylla/core-sdk';
  import { ConfirmOperationAlertDialog, WidgetGrid, widgetSpanStyle } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { LayoutSize, LayoutWidget } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
  import { dashboardMessages } from '@base/features/dashboard/presentation/messages/dashboard.messages.ts';
  import { editorMessages } from '@base/features/dashboard/presentation/messages/editor.messages.ts';
  import { dashboardPath } from '@base/features/dashboard/presentation/presenters/dashboard-paths.presenter.ts';
  import {
    DATA,
    SIZE_CELLS,
    shownSize,
    cellsOf,
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
  import {
    insertAt,
    packGrid,
    placedIndexAt,
    type Span,
  } from '@base/features/dashboard/presentation/presenters/grid-pack.presenter.ts';
  import DropSlot from '../DashboardEditor/DropSlot.svelte';
  import { reflow } from './reflow.animation.ts';
  import MobileBar from './MobileBar.svelte';

  const period = createDashboardPeriod();
  const widgets = createDashboardWidgets(period, () => dashboardView.projectId);
  const dashboards = createDashboards();
  onDestroy(dashboardView.attach(period));
  onDestroy(() => dashboardEditor.stop());

  const routeId = $derived(routeParams().dashboardId ?? null);
  const dashboard = $derived(dashboards.dashboardOf(routeId));
  // The share button of the top bar links to this dashboard.
  onDestroy(dashboardView.show(() => dashboard));
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

  const DWELL_MS = 120;
  const AREA_MARGIN_PX = 24;
  const NEW_WIDGET_ID = 'new-widget';
  const NARROW = { columns: 2, rowHeight: 80, gap: 12 };
  const WIDE = { columns: 8, rowHeight: 98, gap: 16 };
  const WIDE_GRID_PX = 768;
  let gridWidth = $state(0);
  $effect(() => {
    if (gridWidth > 0) dashboardEditor.setColumns(gridWidth >= WIDE_GRID_PX ? WIDE.columns : NARROW.columns);
  });

  /**
   * The widgets as the grid shows them, with the drag at its place. A resize does not change the
   * grid until the release: only the card of the widget shows its new size, over the others.
   */
  const shown = $derived.by((): LayoutWidget[] => {
    const sized = [...items];
    if (!drag || over === null) return sized;
    if (drag.from === 'palette') {
      return insertAt(sized, { id: NEW_WIDGET_ID, data: drag.data, size: drag.size }, over);
    }
    const moved = sized.find(item => item.id === drag.id);
    return moved ? insertAt(sized.filter(item => item.id !== drag.id), moved, over) : sized;
  });
  const slotId = $derived(drag ? (drag.from === 'grid' ? drag.id : NEW_WIDGET_ID) : null);

  /**
   * The index where the drag lands, from the cells of a layout without the dragged widget: the
   * widgets that move out of the way do not change it, so it does not swing.
   */
  const indexAt = (x: number, y: number): number | null => {
    const element = gridArea?.querySelector<HTMLElement>('[data-slot="widget-grid"]');
    if (!element || !drag) return null;
    const box = element.getBoundingClientRect();
    const wide = box.width >= WIDE_GRID_PX;
    const metrics = wide ? WIDE : NARROW;
    const base = drag.from === 'grid' ? items.filter(item => item.id !== drag.id) : items;
    const spans: Span[] = [
      ...base.map(item => {
        return cellsOf(shownSize(item.data, item.size), metrics.columns);
      }),
      { columns: metrics.columns, rows: 1 },
    ];
    return placedIndexAt(
      x,
      y,
      packGrid(spans, metrics.columns),
      { left: box.left, top: box.top, width: box.width, ...metrics },
      AREA_MARGIN_PX,
      over,
    );
  };

  let pending: { at: number; timer: ReturnType<typeof setTimeout> } | null = null;

  /**
   * A new target waits a short time under the pointer before the grid moves to it. Out of the grid,
   * on the panel for example, the drag lands nowhere at once: a moved widget goes back to its place.
   */
  const aim = (at: number | null) => {
    if (at === null || at === over) {
      if (pending) clearTimeout(pending.timer);
      pending = null;
      if (at === null && drag) dashboardEditor.setOver(drag.from === 'grid' ? items.findIndex(item => item.id === drag.id) : null);
      return;
    }
    if (pending?.at === at) return;
    if (pending) clearTimeout(pending.timer);
    if (over === null) {
      pending = null;
      dashboardEditor.setOver(at);
      return;
    }
    pending = {
      at,
      timer: setTimeout(() => {
        pending = null;
        dashboardEditor.setOver(at);
      }, DWELL_MS),
    };
  };

  const settle = () => {
    if (!pending) return;
    clearTimeout(pending.timer);
    dashboardEditor.setOver(pending.at);
    pending = null;
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
    <div bind:this={gridArea} bind:clientWidth={gridWidth}>
    <WidgetGrid aria-label={dashboard.name} class={cn(editing && 'pt-3')}>
      {#if editing}
        {#each shown as item (item.id)}
          <div
            animate:reflow
            data-slot="grid-item"
            style={widgetSpanStyle(shownSize(item.data, item.size))}
            class="relative col-span-(--widget-columns) row-span-(--widget-rows) has-[[data-resizing]]:z-30 @3xl:col-span-(--widget-columns-wide) @3xl:row-span-(--widget-rows-wide)"
          >
            {#if item.id === slotId}
              <DropSlot size={shownSize(item.data, item.size)} />
            {:else}
              {@const live = dashboardEditor.liveResize}
              {@const resized = live?.id === item.id ? { ...item, size: live.size } : item}
              <EditableWidget item={resized} title={titleOf(item)} onOpenData={() => openDrawer(item.id)}>
                <DashboardWidget item={resized} {widgets} {period} />
              </EditableWidget>
            {/if}
          </div>
        {/each}
        <div
          class="relative col-span-full row-span-1 grid grid-cols-8 gap-(--widget-grid-gap-wide)"
        >
          {#each { length: 8 } as _, index (index)}
            <span
              class={cn('rounded-xl', drag && over === (drag.from === 'grid' ? items.length - 1 : items.length) && slotId === null ? 'border-2 border-dashed border-primary/60 bg-primary/15' : 'bg-muted/50')}
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
    if (!editing) return;
    dashboardEditor.move(event.clientX, event.clientY);
    if (dashboardEditor.drag) aim(indexAt(event.clientX, event.clientY));
  }}
  onpointerup={() => {
    if (!editing) return;
    settle();
    dashboardEditor.release();
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
    onAdd={(data, size, target) => {
      dashboardEditor.add(data, size, undefined, target);
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
    onCreate={async (name, start, makeDefault) => {
      const created = await dashboards.create(name, start, makeDefault);
      dashboardView.setCreating(false);
      dashboardEditor.start(created.id, created.widgets);
      scyllaNavigate.goToWorkspaceRoute(`/${dashboardPath(created.id, makeDefault)}`);
    }}
    onClose={() => dashboardView.setCreating(false)}
  />
{/if}
