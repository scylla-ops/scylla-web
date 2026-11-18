<script lang="ts">
  import CalendarIcon from '@lucide/svelte/icons/calendar';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
  import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
  import PencilIcon from '@lucide/svelte/icons/pencil';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import StarIcon from '@lucide/svelte/icons/star';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import { contextStore, scyllaNavigate } from '@platform/context';
  import { createQuery, routeParams } from '@scylla/core-sdk';
  import { SegmentedControl, type LucideIcon } from '@scylla/ui';
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
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
  import { editorMessages } from '@base/features/dashboard/presentation/messages/editor.messages.ts';
  import { customPeriodLabel } from '@base/features/dashboard/presentation/presenters/period-options.presenter.ts';
  import {
    customPeriodFrom,
    type PresetPeriodKind,
  } from '@base/features/dashboard/presentation/presenters/period.presenter.ts';
  import { dashboardPath } from '@base/features/dashboard/presentation/presenters/dashboard-paths.presenter.ts';
  import { utcOffsetLabel } from '@base/features/dashboard/presentation/presenters/zoned-day.presenter.ts';
  import { dashboardEditor } from '@base/features/dashboard/presentation/ui/dashboard-editor.state.svelte.ts';
  import { dashboardView } from '@base/features/dashboard/presentation/ui/dashboard-view.state.svelte.ts';
  import { createDashboards } from '@base/features/dashboard/presentation/ui/dashboards.state.svelte.ts';
  import RenameDialog from '../DashboardEditor/RenameDialog.svelte';
  import CustomPeriodForm from '../PeriodPicker/CustomPeriodForm.svelte';
  import PanelAction from './PanelAction.svelte';

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
  const dashboards = createDashboards();

  const openId = $derived(routeParams().dashboardId ?? dashboards.set.defaultId);
  const period = $derived(dashboardView.period);
  const kind = $derived(period?.period.kind);
  const options = $derived(PRESETS.map(value => ({ value, label: t(LABELS[value]) })));
  const draft = $derived(period ? customPeriodFrom(period.period, period.today()) : null);
  const scope = $derived(
    projectItems.some(project => project.id === dashboardView.projectId)
      ? (dashboardView.projectId ?? ALL)
      : ALL,
  );
  const scopeLabel = $derived(
    projectItems.find(project => project.id === scope)?.name ?? t(messages.allProjects),
  );

  let customOpen = $state(false);
  let listWidth = $state(200);
  let footerWidth = $state(200);
  const compactNew = $derived(listWidth < 160);
  const compactEdit = $derived(footerWidth < 176);
  let renaming = $state<{ id: string; name: string } | null>(null);

  const open = (id: string) =>
    scyllaNavigate.goToWorkspaceRoute(`/${dashboardPath(id, dashboards.isDefault(id))}`);

  const startEdit = () => {
    const dashboard = dashboards.dashboardOf(openId);
    if (dashboard) dashboardEditor.start(dashboard.id, dashboard.widgets);
  };

  const remove = (id: string) => {
    const wasOpen = id === openId;
    dashboards.remove(id);
    if (wasOpen) scyllaNavigate.goToWorkspaceRoute('/dashboard');
  };

  const section = 'px-4 pt-5 pb-2 text-xs text-muted-foreground';
  const row =
    'flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring';
</script>

<div class="flex h-12 shrink-0 items-center px-4">
  <h2 class="truncate text-base">{t(messages.dashboard)}</h2>
</div>

<div class="relative flex min-h-0 flex-1 flex-col overflow-y-auto" bind:clientWidth={listWidth}>
  <p class={section}>{t(messages.dashboards)}</p>
  <ul class="flex flex-col gap-0.5 px-2">
    {#each dashboards.set.dashboards as dashboard (dashboard.id)}
      {@const current = dashboard.id === openId}
      <li class="group/row relative">
        <button
          type="button"
          class={cn(row, current ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-accent')}
          aria-current={current ? 'page' : undefined}
          onclick={() => open(dashboard.id)}
        >
          <LayoutDashboardIcon class="size-4 shrink-0" aria-hidden="true" />
          <span class="min-w-0 flex-1 truncate">{dashboard.name}</span>
          {#if dashboards.isDefault(dashboard.id)}
            <span class="shrink-0 rounded-md bg-background px-1.5 py-0.5 text-[11px] font-medium group-hover/row:invisible">
              {t(messages.defaultBadge)}
            </span>
          {/if}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger>
            {#snippet child({ props })}
              <button
                type="button"
                {...props}
                class="absolute top-1/2 right-1 flex size-6 -translate-y-1/2 items-center justify-center rounded-md opacity-0 group-hover/row:opacity-100 hover:bg-background focus-visible:opacity-100 data-[state=open]:opacity-100"
                aria-label={t(editorMessages.dashboardActions(dashboard.name))}
              >
                <EllipsisIcon class="size-4" aria-hidden="true" />
              </button>
            {/snippet}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right" class="w-64">
            <DropdownMenuItem onSelect={() => (renaming = { id: dashboard.id, name: dashboard.name })}>
              <PencilIcon aria-hidden="true" />{t(editorMessages.rename)}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={dashboards.isDefault(dashboard.id)} onSelect={() => dashboards.setDefault(dashboard.id)}>
              <StarIcon aria-hidden="true" />{t(editorMessages.setAsDefault)}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                const copy = dashboards.duplicate(dashboard.id);
                if (copy) open(copy);
              }}
            >
              <CopyIcon aria-hidden="true" />{t(editorMessages.duplicate)}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={dashboards.set.dashboards.length < 2}
              onSelect={() => remove(dashboard.id)}
            >
              <Trash2Icon aria-hidden="true" />{t(editorMessages.deleteDashboard)}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </li>
    {/each}
    <li>
      {#if compactNew}
        <PanelAction
          variant="ghost"
          icon={PlusIcon as LucideIcon}
          label={t(editorMessages.newDashboard)}
          compact
          onclick={() => dashboardView.setCreating(true)}
        />
      {:else}
        <button type="button" class={cn(row, 'hover:bg-accent')} onclick={() => dashboardView.setCreating(true)}>
          <PlusIcon class="size-4 shrink-0" aria-hidden="true" />
          <span class="truncate">{t(editorMessages.newDashboard)}</span>
        </button>
      {/if}
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
              <CalendarIcon class="size-4 shrink-0" aria-hidden="true" />
              <span class="min-w-0 flex-1 truncate">
                {#if period.period.kind === 'custom'}
                  {customPeriodLabel(period.period.from, period.period.to)}
                {:else if period.period.kind === '30d'}
                  {t(messages.last30DaysLong)}
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

{#if period}
  <div class="flex shrink-0 justify-center border-t border-sidebar-border p-4" bind:clientWidth={footerWidth}>
    <PanelAction
      variant="outline"
      size="default"
      class={compactEdit ? undefined : 'w-full'}
      icon={PencilIcon as LucideIcon}
      label={t(editorMessages.editDashboard)}
      compact={compactEdit}
      onclick={startEdit}
    />
  </div>
{/if}

{#if renaming}
  <RenameDialog
    name={renaming.name}
    onRename={name => {
      if (renaming) dashboards.rename(renaming.id, name);
      renaming = null;
    }}
    onClose={() => (renaming = null)}
  />
{/if}
