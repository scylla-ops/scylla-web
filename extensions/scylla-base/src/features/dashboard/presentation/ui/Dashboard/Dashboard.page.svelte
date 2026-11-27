<script lang="ts">
  import PlusIcon from '@lucide/svelte/icons/plus';
  import { onDestroy } from 'svelte';
  import { scyllaNavigate } from '@platform/context';
  import { guardLeave, routeParams } from '@scylla/core-sdk';
  import { ConfirmOperationAlertDialog, reflow, WidgetGrid, widgetSpanStyle } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { LayoutWidget } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
  import { dashboardMessages } from '@base/features/dashboard/presentation/messages/dashboard.messages.ts';
  import { editorMessages } from '@base/features/dashboard/presentation/messages/editor.messages.ts';
  import { dashboardPath } from '@base/features/dashboard/presentation/presenters/dashboard-paths.presenter.ts';
  import { DATA, shownSize } from '@base/features/dashboard/presentation/presenters/widget-catalog.presenter.ts';
  import { widgetDragNews } from '@base/features/dashboard/presentation/presenters/widget-drag.presenter.ts';
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
  import { insertAt } from '@base/features/dashboard/presentation/presenters/grid-pack.presenter.ts';
  import { dragWidgets } from '@base/features/dashboard/presentation/ui/widget-drag.attachments.ts';
  import DropSlot from '../DashboardEditor/DropSlot.svelte';
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

  let leaving = $state<(() => void) | null>(null);
  const unsaved = $derived(editing && dashboardEditor.changes > 0);
  /** A press in these keeps the selection: the widget and its toolbar, the drawer, a dialog or a menu. */
  const KEEPS_SELECTION =
    '[data-slot="editable-widget"], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [data-slot$="overlay"], [data-slot$="-content"]';
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

  const NEW_WIDGET_ID = 'new-widget';
  const MOVE_KEYS_HINT = 'widget-move-keys-hint';
  const WIDE_GRID_PX = 768;
  let gridWidth = $state(0);
  $effect(() => {
    if (gridWidth > 0) dashboardEditor.setColumns(gridWidth >= WIDE_GRID_PX ? 8 : 2);
  });

  /**
   * The widgets as the grid shows them, with the drag at its place: "Drop here" for a pointer, the
   * widget itself for the keyboard. A resize does not change the grid until the release: only the
   * card of the widget shows its new size, over the others.
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
  const slotId = $derived(drag && !drag.keyboard ? (drag.from === 'grid' ? drag.id : NEW_WIDGET_ID) : null);
  const news = $derived(
    widgetDragNews({
      drag,
      over,
      moved: dashboardEditor.moved,
      count: dashboardEditor.widgets.length,
      ended: dashboardEditor.ended,
    }),
  );
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
    <div bind:clientWidth={gridWidth} {@attach dragWidgets}>
    <!--
      The room of the handles of the edit mode, above the first row, is kept in the two modes: the
      widgets do not move down when the edit mode starts.
    -->
    <WidgetGrid aria-label={dashboard.name} class="pt-3">
      {#if editing}
        {#each shown as item (item.id)}
          <div
            animate:reflow
            data-slot="grid-item"
            data-widget={item.id}
            style={widgetSpanStyle(shownSize(item.data, item.size))}
            class="relative col-span-(--widget-columns) row-span-(--widget-rows) has-[[data-resizing]]:z-30 @3xl:col-span-(--widget-columns-wide) @3xl:row-span-(--widget-rows-wide)"
          >
            {#if item.id === slotId}
              <DropSlot size={shownSize(item.data, item.size)} />
            {:else}
              {@const live = dashboardEditor.liveResize}
              {@const resized = live?.id === item.id ? { ...item, size: live.size } : item}
              <EditableWidget
                item={resized}
                title={titleOf(item)}
                keysHintId={MOVE_KEYS_HINT}
                onOpenData={() => openDrawer(item.id)}
              >
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

{#if editing}
  <p class="sr-only" aria-live="polite">{news}</p>
  <p id={MOVE_KEYS_HINT} class="sr-only">{t(editorMessages.moveKeysHint)}</p>
{/if}

<!-- The lifted widget of a pointer drag: it follows the pointer, then flies into its slot. -->
{#if drag && dashboardEditor.ghost.active}
  <div
    data-slot="drag-ghost"
    aria-hidden="true"
    inert
    class={cn(
      'pointer-events-none flex rounded-2xl bg-background ring-2 ring-primary/70 [&>[data-slot=widget]]:size-full',
      dashboardEditor.ghost.lifted ? 'shadow-2xl' : 'shadow-sm',
    )}
    style={dashboardEditor.ghost.style}
  >
    <DashboardWidget item={{ data: drag.data, size: drag.size }} {widgets} {period} />
  </div>
{/if}

<svelte:window
  onpointerdown={event => {
    if (!editing || !dashboardEditor.selected) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest(KEEPS_SELECTION)) dashboardEditor.select(null);
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
