<script lang="ts">
  import CalendarIcon from '@lucide/svelte/icons/calendar';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
  import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
  import LockIcon from '@lucide/svelte/icons/lock';
  import UsersIcon from '@lucide/svelte/icons/users';
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
  import { fitLevels } from '@base/features/dashboard/presentation/presenters/fit-labels.presenter.ts';
  import { dashboardPath } from '@base/features/dashboard/presentation/presenters/dashboard-paths.presenter.ts';
  import { utcOffsetLabel } from '@base/features/dashboard/presentation/presenters/zoned-day.presenter.ts';
  import { dashboardEditor } from '@base/features/dashboard/presentation/ui/dashboard-editor.state.svelte.ts';
  import { dashboardView } from '@base/features/dashboard/presentation/ui/dashboard-view.state.svelte.ts';
  import { createDashboards } from '@base/features/dashboard/presentation/ui/dashboards.state.svelte.ts';
  import RenameDialog from '../DashboardEditor/RenameDialog.svelte';
  import CustomPeriodForm from '../PeriodPicker/CustomPeriodForm.svelte';
  import FitButtons from './FitButtons.svelte';
  import GatedTooltip from './GatedTooltip.svelte';

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
  const ROW_CHROME_PX = 40;
  let newRowWidth = $state(0);
  let newFullWidth = $state(0);
  let newShortWidth = $state(0);
  const newLevel = $derived(
    fitLevels(newRowWidth - ROW_CHROME_PX, 0, [{ full: newFullWidth, short: newShortWidth, icon: 0 }], [0])[0],
  );
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

<div class="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
  <p class={section}>{t(messages.dashboards)}</p>
  <ul class="flex flex-col gap-0.5 px-2">
    {#each dashboards.set.dashboards as dashboard (dashboard.id)}
      {@const current = dashboard.id === openId}
      <li class="group/row @container/row relative">
        <button
          type="button"
          class={cn(row, current ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-accent')}
          aria-current={current ? 'page' : undefined}
          onclick={() => open(dashboard.id)}
        >
          <LayoutDashboardIcon class="size-4 shrink-0" aria-hidden="true" />
          <span
            class="min-w-0 flex-1 truncate"
            title={dashboards.isDefault(dashboard.id) ? `${dashboard.name} · ${t(messages.defaultBadge)}` : dashboard.name}
          >
            {dashboard.name}
          </span>
          <span
            data-slot="row-end"
            class={cn(
              'flex min-w-6 shrink-0 items-center justify-end gap-1.5 transition-opacity duration-150 motion-reduce:transition-none',
              'group-hover/row:opacity-0 group-has-[:focus-visible]/row:opacity-0 group-has-[[data-state=open]]/row:opacity-0',
            )}
          >
            {#if dashboard.visibility === 'workspace'}
              <UsersIcon class="size-3.5 shrink-0 text-muted-foreground" aria-label={t(editorMessages.shared)} />
            {/if}
            {#if dashboard.teamDefault && !dashboards.isDefault(dashboard.id)}
              <span class="shrink-0 rounded-md bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
                {t(editorMessages.teamBadge)}
              </span>
            {/if}
            {#if dashboards.isDefault(dashboard.id)}
              <span class="shrink-0 rounded-md bg-background px-1.5 py-0.5 text-[11px] font-medium @max-[200px]/row:hidden">
                {t(messages.defaultBadge)}
              </span>
              <span
                role="img"
                aria-label={t(messages.defaultBadge)}
                title={t(messages.defaultBadge)}
                data-part="default-star"
                class="hidden shrink-0 @max-[200px]/row:inline-flex"
              >
                <StarIcon aria-hidden="true" class="size-3.5 fill-current text-muted-foreground" />
              </span>
            {/if}
          </span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger>
            {#snippet child({ props })}
              <button
                type="button"
                {...props}
                class="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md opacity-0 transition-opacity duration-150 group-hover/row:opacity-100 hover:bg-background focus-visible:opacity-100 data-[state=open]:opacity-100 motion-reduce:transition-none"
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
              onSelect={async () => {
                const copy = await dashboards.duplicate(dashboard.id);
                if (copy) open(copy);
              }}
            >
              <CopyIcon aria-hidden="true" />{t(editorMessages.duplicate)}
            </DropdownMenuItem>
            {#if dashboard.version !== undefined}
              {#if dashboard.visibility === 'workspace'}
                <DropdownMenuItem onSelect={() => dashboards.share(dashboard.id, 'private')}>
                  <LockIcon aria-hidden="true" />{t(editorMessages.makePrivate)}
                </DropdownMenuItem>
                <DropdownMenuItem disabled={dashboard.teamDefault} onSelect={() => dashboards.setTeamDefault(dashboard.id)}>
                  <UsersIcon aria-hidden="true" />{t(editorMessages.setTeamDefault)}
                </DropdownMenuItem>
              {:else}
                <DropdownMenuItem onSelect={() => dashboards.share(dashboard.id, 'workspace')}>
                  <UsersIcon aria-hidden="true" />
                  <span>{t(editorMessages.shareWithWorkspace)}</span>
                  <span class="ml-auto text-xs text-muted-foreground">{t(editorMessages.shareHint)}</span>
                </DropdownMenuItem>
              {/if}
            {/if}
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
      <GatedTooltip label={t(editorMessages.newDashboard)} enabled={newLevel !== 'full'} resetKey={newLevel} side="right">
        {#snippet trigger({ props })}
            <button
              {...props}
              type="button"
              class={cn(row, 'relative hover:bg-accent')}
              aria-label={newLevel === 'full' ? undefined : t(editorMessages.newDashboard)}
              data-level={newLevel}
              bind:clientWidth={newRowWidth}
              onclick={() => dashboardView.setCreating(true)}
            >
              <PlusIcon class="size-4 shrink-0" aria-hidden="true" />
              {#if newLevel !== 'icon'}
                <span class="truncate">
                  {newLevel === 'full' ? t(editorMessages.newDashboard) : t(editorMessages.newShort)}
                </span>
              {/if}
              <span aria-hidden="true" class="pointer-events-none invisible absolute top-0 left-0 flex h-0 w-max overflow-hidden whitespace-nowrap">
                <span bind:offsetWidth={newFullWidth}>{t(editorMessages.newDashboard)}</span>
                <span bind:offsetWidth={newShortWidth}>{t(editorMessages.newShort)}</span>
              </span>
            </button>
        {/snippet}
      </GatedTooltip>
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
  <div class="shrink-0 border-t border-sidebar-border p-4">
    <FitButtons
      stretch
      size="default"
      collapseOrder={['edit']}
      actions={[
        {
          key: 'edit',
          label: t(editorMessages.editDashboard),
          short: t(editorMessages.editShort),
          icon: PencilIcon as LucideIcon,
          variant: 'outline',
          labeledIcon: true,
          onclick: startEdit,
        },
      ]}
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
