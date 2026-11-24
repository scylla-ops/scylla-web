<script lang="ts">
  import PencilIcon from '@lucide/svelte/icons/pencil';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import { scyllaNavigate } from '@platform/context';
  import { SegmentedControl } from '@scylla/ui';
  import {
    Button,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { DashboardLayout } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
  import { dashboardMessages } from '@base/features/dashboard/presentation/messages/dashboard.messages.ts';
  import { editorMessages as messages } from '@base/features/dashboard/presentation/messages/editor.messages.ts';
  import { dashboardPath } from '@base/features/dashboard/presentation/presenters/dashboard-paths.presenter.ts';
  import type { PresetPeriodKind } from '@base/features/dashboard/presentation/presenters/period.presenter.ts';
  import { dashboardEditor } from '@base/features/dashboard/presentation/ui/dashboard-editor.state.svelte.ts';
  import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
  import { dashboardView } from '@base/features/dashboard/presentation/ui/dashboard-view.state.svelte.ts';
  import type { DashboardsState } from '@base/features/dashboard/presentation/ui/dashboards.state.svelte.ts';

  interface Props {
    dashboard: DashboardLayout;
    dashboards: DashboardsState;
    period: DashboardPeriodState;
    editing: boolean;
  }

  let { dashboard, dashboards, period, editing }: Props = $props();

  const PRESETS: readonly PresetPeriodKind[] = ['24h', '7d', '14d'];
  const LABELS = {
    '24h': dashboardMessages.last24Hours,
    '7d': dashboardMessages.last7Days,
    '14d': dashboardMessages.last14Days,
    '30d': dashboardMessages.last30Days,
  } as const;
  const options = $derived(PRESETS.map(value => ({ value, label: t(LABELS[value]) })));
  const changes = $derived(dashboardEditor.changes);

  const save = () => {
    dashboards.saveWidgets(dashboard.id, dashboardEditor.widgets);
    dashboardEditor.stop();
  };
</script>

<div data-slot="dashboard-mobile-bar" class="mb-3 md:hidden">
  {#if editing}
    <div class="flex items-center gap-2">
      <Button variant="ghost" size="sm" onclick={() => dashboardEditor.stop()}>{t(messages.cancel)}</Button>
      <div class="min-w-0 flex-1 text-center">
        <p class="text-sm font-medium">{t(messages.editDashboard)}</p>
        <p class="truncate text-xs text-muted-foreground">
          {dashboard.name}{changes > 0 ? ` · ${changes === 1 ? t(messages.oneChangeNotSaved) : t(messages.changesNotSaved(changes))}` : ''}
        </p>
      </div>
      <Button size="sm" disabled={changes === 0} onclick={save}>{t(messages.saveLayout)}</Button>
    </div>
    <div class="fixed inset-x-0 bottom-6 z-30 flex justify-center">
      <Button class="rounded-full shadow-lg" onclick={() => dashboardView.openAdd('sentence')}>
        <PlusIcon aria-hidden="true" />
        {t(messages.addWidgetAction)}
      </Button>
    </div>
  {:else}
    <div class="flex items-center gap-2">
      <Select
        type="single"
        value={dashboard.id}
        onValueChange={id => scyllaNavigate.goToWorkspaceRoute(`/${dashboardPath(id, dashboards.isDefault(id))}`)}
      >
        <SelectTrigger class="h-8 max-w-40 min-w-0" aria-label={t(dashboardMessages.dashboards)}>
          <SelectValue class="min-w-0 truncate">{dashboard.name}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {#each dashboards.set.dashboards as item (item.id)}
            <SelectItem value={item.id} label={item.name}>{item.name}</SelectItem>
          {/each}
        </SelectContent>
      </Select>
      <SegmentedControl
        size="sm"
        class="ml-auto"
        aria-label={t(dashboardMessages.period)}
        value={period.period.kind as PresetPeriodKind}
        {options}
        onChange={value => period.select(value)}
      />
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={t(messages.editDashboard)}
        title={t(messages.editDashboard)}
        onclick={() => dashboardEditor.start(dashboard.id, dashboard.widgets)}
      >
        <PencilIcon aria-hidden="true" />
      </Button>
    </div>
  {/if}
</div>
