<script lang="ts">
  import CalendarIcon from '@lucide/svelte/icons/calendar';
  import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
  import { contextStore } from '@platform/context';
  import { createQuery } from '@scylla/core-sdk';
  import { SegmentedControl } from '@scylla/ui';
  import {
    Popover,
    PopoverContent,
    PopoverTrigger,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { toRune } from '@scylla/ui/stores';
  import { cn } from '@scylla/ui/utils';
  import { projectQueries } from '@base/features/project';
  import { dashboardMessages as messages } from '@base/features/dashboard/presentation/messages/dashboard.messages.ts';
  import { customPeriodLabel } from '@base/features/dashboard/presentation/presenters/period-options.presenter.ts';
  import {
    customPeriodFrom,
    type PresetPeriodKind,
  } from '@base/features/dashboard/presentation/presenters/period.presenter.ts';
  import { utcOffsetLabel } from '@base/features/dashboard/presentation/presenters/zoned-day.presenter.ts';
  import { dashboardView } from '@base/features/dashboard/presentation/ui/dashboard-view.state.svelte.ts';
  import CustomPeriodForm from '../PeriodPicker/CustomPeriodForm.svelte';

  const ALL = 'all';
  const PRESETS: readonly PresetPeriodKind[] = ['24h', '7d', '14d'];
  const LABELS = {
    '24h': messages.last24Hours,
    '7d': messages.last7Days,
    '14d': messages.last14Days,
    '30d': messages.last30Days,
  } as const;

  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id);
  const projects = createQuery(() => projectQueries.lookup(workspaceId));
  const projectItems = $derived(projects.data?.items ?? []);

  const period = $derived(dashboardView.period);
  const kind = $derived(period?.period.kind);
  const options = $derived(PRESETS.map(value => ({ value, label: t(LABELS[value]) })));
  const scope = $derived(
    projectItems.some(project => project.id === dashboardView.projectId)
      ? (dashboardView.projectId ?? ALL)
      : ALL,
  );
  const scopeLabel = $derived(
    projectItems.find(project => project.id === scope)?.name ?? t(messages.allProjects),
  );

  const draft = $derived(period ? customPeriodFrom(period.period, period.today()) : null);

  let customOpen = $state(false);

  const section = 'px-4 pt-5 pb-2 text-xs text-muted-foreground';
  const row =
    'flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring';
</script>

<div data-slot="dashboard-panel" class="flex min-h-0 flex-1 flex-col">
  <div class="flex h-12 shrink-0 items-center px-4">
    <h2 class="truncate text-base">{t(messages.dashboard)}</h2>
  </div>

  <div class="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
    <p class={section}>{t(messages.dashboards)}</p>
    <ul class="flex flex-col gap-0.5 px-2">
      <li>
        <div class={cn(row, 'bg-sidebar-accent text-sidebar-accent-foreground')} aria-current="page">
          <LayoutDashboardIcon class="size-4 shrink-0" />
          <span class="min-w-0 flex-1 truncate">{t(messages.opsOverview)}</span>
          <span class="shrink-0 rounded-md bg-background px-1.5 py-0.5 text-[11px] font-medium">
            {t(messages.defaultBadge)}
          </span>
        </div>
      </li>
    </ul>

    {#if period}
      <p class={section}>{t(messages.period)}</p>
      <div class="flex flex-col gap-1 px-2">
        <SegmentedControl
          size="sm"
          fill
          aria-label={t(messages.period)}
          value={(kind ?? '14d') as PresetPeriodKind}
          {options}
          onChange={value => period.select(value)}
        />
        <Popover bind:open={customOpen}>
          <PopoverTrigger>
            {#snippet child({ props })}
              <button
                type="button"
                {...props}
                class={cn(row, kind === 'custom' || kind === '30d' ? 'bg-sidebar-accent' : 'hover:bg-accent')}
              >
                <CalendarIcon class="size-4 shrink-0" />
                <span class="min-w-0 flex-1 truncate">
                  {#if period.period.kind === 'custom'}
                    {customPeriodLabel(period.period.from, period.period.to)}
                  {:else if period.period.kind === '30d'}
                    {t(messages.last30Days)}
                  {:else}
                    {t(messages.customRange)}
                  {/if}
                </span>
              </button>
            {/snippet}
          </PopoverTrigger>
          <PopoverContent align="start" side="right" class="w-auto">
            <div class="flex flex-col gap-3">
              <button
                type="button"
                class="self-start text-xs text-muted-foreground underline-offset-2 hover:underline"
                onclick={() => {
                  period.select('30d');
                  customOpen = false;
                }}
              >
                {t(messages.last30DaysLong)}
              </button>
              <CustomPeriodForm
                from={draft?.kind === 'custom' ? draft.from : period.today()}
                to={draft?.kind === 'custom' ? draft.to : period.today()}
                today={period.today()}
                onApply={(from, to) => {
                  period.applyCustom(from, to);
                  customOpen = false;
                }}
              />
            </div>
          </PopoverContent>
        </Popover>
        {#if period.timeZone}
          <p class="px-2 pt-1 text-[11px] text-muted-foreground">
            {t(messages.timesIn(period.timeZone, utcOffsetLabel(period.timeZone, new Date())))}
          </p>
        {/if}
      </div>

      <p class={section}>{t(messages.scope)}</p>
      <div class="px-2">
        <Select
          type="single"
          value={scope}
          onValueChange={value => dashboardView.setProject(value === ALL ? null : value)}
        >
          <SelectTrigger class="h-8 w-full" aria-label={t(messages.scope)}>
            <SelectValue>{scopeLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL} label={t(messages.allProjects)}>{t(messages.allProjects)}</SelectItem>
            {#each projectItems as project (project.id)}
              <SelectItem value={project.id} label={project.name}>{project.name}</SelectItem>
            {/each}
          </SelectContent>
        </Select>
      </div>
    {/if}
  </div>
</div>
