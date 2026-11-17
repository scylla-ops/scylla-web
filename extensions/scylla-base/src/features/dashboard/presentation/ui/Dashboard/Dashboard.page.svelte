<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import PencilIcon from '@lucide/svelte/icons/pencil';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import { scyllaNavigate } from '@platform/context';
  import { routeParams } from '@scylla/core-sdk';
  import { FeatureHeader, WidgetGrid } from '@scylla/ui';
  import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    Input,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import {
    DEFAULT_DASHBOARD_ID,
    missingWidgets,
  } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
  import { createDashboardPeriod } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
  import {
    createDashboardLayout,
    dashboardEditMode,
  } from '@base/features/dashboard/presentation/ui/dashboard-layout.state.svelte.ts';
  import { createDashboardWidgets } from '@base/features/dashboard/presentation/ui/widgets/dashboard-widgets.state.svelte.ts';
  import { utcOffsetLabel } from '@base/features/dashboard/presentation/presenters/zoned-day.presenter.ts';
  import {
    dashboardPath,
    NEW_DASHBOARD_ID,
  } from '@base/features/dashboard/presentation/presenters/dashboard-paths.presenter.ts';
  import { firstSize } from '@base/features/dashboard/presentation/presenters/widget-sizes.presenter.ts';
  import { widgetTitle } from '@base/features/dashboard/presentation/presenters/widget-titles.presenter.ts';
  import DashboardWidget from '../DashboardEditor/DashboardWidget.svelte';
  import WidgetEditTools from '../DashboardEditor/WidgetEditTools.svelte';
  import PeriodPicker from '../PeriodPicker/PeriodPicker.svelte';
  import { dashboardMessages } from '@base/features/dashboard/presentation/messages/dashboard.messages.ts';

  const dashboardId = $derived(routeParams().dashboardId ?? DEFAULT_DASHBOARD_ID);
  const layout = createDashboardLayout(() => dashboardId);
  const dashboardPeriod = createDashboardPeriod();
  const widgets = createDashboardWidgets(dashboardPeriod);

  const editing = $derived(dashboardEditMode.on);
  const current = $derived(layout.current);
  const name = $derived(current?.name ?? t(dashboardMessages.overview));
  const missing = $derived(current ? missingWidgets(current) : []);

  const open = (id: string) =>
    scyllaNavigate.goToWorkspaceRoute(`/${dashboardPath(id)}`, { replace: true });

  $effect(() => {
    if (!layout.loaded || current) return;
    if (dashboardId === NEW_DASHBOARD_ID) {
      const count = layout.dashboards.length + 1;
      const id = layout.create(t(dashboardMessages.numberedDashboard(count)));
      dashboardEditMode.set(true);
      open(id);
      return;
    }
    open(DEFAULT_DASHBOARD_ID);
  });

  const deleteDashboard = () => {
    layout.deleteCurrent();
    dashboardEditMode.set(false);
    open(DEFAULT_DASHBOARD_ID);
  };
</script>

{#snippet underLabel()}
  {#if dashboardPeriod.timeZone}
    <p class="text-sm text-muted-foreground">
      {t(
        dashboardMessages.timesIn(
          dashboardPeriod.timeZone,
          utcOffsetLabel(dashboardPeriod.timeZone, new Date()),
        ),
      )}
    </p>
  {/if}
{/snippet}

{#snippet extraActions()}
  <PeriodPicker
    period={dashboardPeriod.period}
    today={dashboardPeriod.today}
    onSelect={dashboardPeriod.select}
    onApplyCustom={dashboardPeriod.applyCustom}
  />
  {#if editing}
    <Button size="sm" onclick={() => dashboardEditMode.set(false)}>
      <CheckIcon aria-hidden="true" />
      {t(dashboardMessages.done)}
    </Button>
  {:else}
    <Button variant="outline" size="sm" onclick={() => dashboardEditMode.set(true)}>
      <PencilIcon aria-hidden="true" />
      {t(dashboardMessages.edit)}
    </Button>
  {/if}
{/snippet}

<div class="flex h-full min-h-0 w-full flex-col gap-4">
  <FeatureHeader label={name} {underLabel} {extraActions} />

  {#if editing && current}
    <div data-slot="dashboard-edit-bar" class="flex shrink-0 flex-wrap items-center gap-2">
      {#if !layout.isDefault}
        <Input
          class="h-8 w-64"
          aria-label={t(dashboardMessages.dashboardName)}
          value={current.name ?? ''}
          onchange={event => layout.rename(event.currentTarget.value.trim() || name)}
        />
      {/if}
      <DropdownMenu>
        <DropdownMenuTrigger disabled={missing.length === 0}>
          {#snippet child({ props })}
            <Button
              variant="outline"
              size="sm"
              title={missing.length === 0 ? t(dashboardMessages.allWidgetsShown) : undefined}
              {...props}
            >
              <PlusIcon aria-hidden="true" />
              {t(dashboardMessages.addWidget)}
            </Button>
          {/snippet}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {#each missing as widget (widget)}
            <DropdownMenuItem onSelect={() => layout.add(widget, firstSize(widget))}>
              {widgetTitle(widget)}
            </DropdownMenuItem>
          {/each}
        </DropdownMenuContent>
      </DropdownMenu>
      {#if !layout.isDefault}
        <Button variant="ghost" size="sm" class="ml-auto text-destructive" onclick={deleteDashboard}>
          <Trash2Icon aria-hidden="true" />
          {t(dashboardMessages.deleteDashboard)}
        </Button>
      {/if}
    </div>
  {/if}

  {#if current && current.widgets.length === 0}
    <div
      data-slot="dashboard-empty"
      class="flex shrink-0 flex-col items-center gap-1 rounded-xl border border-dashed px-4 py-12 text-center"
    >
      <p class="text-sm">{t(dashboardMessages.noWidget)}</p>
      <p class="text-sm text-muted-foreground">
        {t(editing ? dashboardMessages.noWidgetEditing : dashboardMessages.noWidgetHint)}
      </p>
    </div>
  {:else if current}
    <WidgetGrid class="shrink-0">
      {#each current.widgets as item (item.widget)}
        {#snippet tools()}
          <WidgetEditTools
            {item}
            title={widgetTitle(item.widget)}
            onResize={size => layout.resize(item.widget, size)}
            onRemove={() => layout.remove(item.widget)}
          />
        {/snippet}
        <DashboardWidget
          {item}
          {widgets}
          period={dashboardPeriod}
          editing={editing ? tools : undefined}
        />
      {/each}
    </WidgetGrid>
  {/if}
</div>
