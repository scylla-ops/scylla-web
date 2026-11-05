<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity';
  import BotIcon from '@lucide/svelte/icons/bot';
  import SearchIcon from '@lucide/svelte/icons/search';
  import { can, Permission } from '@platform/authz';
  import { contextStore, scyllaNavigate } from '@platform/context';
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { ConfirmOperationAlertDialog, ErrorState, FeatureHeader, ListSkeleton } from '@scylla/ui';
  import {
    Input,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    ToggleGroup,
    ToggleGroupItem,
  } from '@scylla/ui/primitives';
  import { toRune } from '@scylla/ui/stores';
  import { t } from '@scylla/ui/i18n';
  import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
  import {
    AGENT_FILTERS,
    countByFilter,
    dailyJobs,
    matchesFilter,
    matchesSearch,
    summarizeAgents,
    type AgentFilter,
  } from '@base/features/apps/domain/structs/agent-list.struct.ts';
  import { endedJobs, sumOutcomes } from '@base/features/apps/domain/structs/agent-stats.struct.ts';
  import type { AgentAccess } from '@base/features/apps/domain/structs/agent-access.struct.ts';
  import { appMutations, appQueries } from '@base/features/apps/presentation/apps.queries.ts';
  import AddAgentDialog from '../AddAgentDialog/AddAgentDialog.svelte';
  import EmptyList from '../EmptyList/EmptyList.svelte';
  import Sparkline from '../Sparkline/Sparkline.svelte';
  import AgentCard from './AgentCard.svelte';
  import AgentStatCards from './AgentStatCards.svelte';
  import AgentStatusCell from './AgentStatusCell.svelte';
  import AppRowMenu from '../AppRowMenu/AppRowMenu.svelte';
  import { agentsListMessages as messages } from '@base/features/apps/presentation/messages/agents-list.messages.ts';

  const phone = new MediaQuery('(max-width: 639px)');

  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id ?? '');
  const target = $derived({ workspaceId });

  const canCreate = $derived(can(Permission.CREATE_APP, target));
  const canManage = $derived(can(Permission.DELETE_APP, target));
  const canReadAccess = $derived(can(Permission.LIST_WORKSPACE_MEMBERS, target));

  const agents = createQuery(() => appQueries.list(workspaceId, 'agents'));
  const stats = createQuery(() => appQueries.agentStats(workspaceId));
  const agentIds = $derived((agents.data ?? []).map(agent => agent.id));
  const access = createQuery(() => appQueries.agentAccess(workspaceId, agentIds, canReadAccess));

  const disable = createMutation(() => appMutations.disable());
  const enable = createMutation(() => appMutations.enable());
  const remove = createMutation(() => appMutations.remove('agent'));

  let filter = $state<AgentFilter>('all');
  let search = $state('');
  let addOpen = $state(false);
  let joining = $state<AppEntity | null>(null);
  let disabling = $state<AppEntity | null>(null);
  let deleting = $state<AppEntity | null>(null);

  const all = $derived(agents.data ?? []);
  const counts = $derived(countByFilter(all));
  const summary = $derived(summarizeAgents(all));
  const shown = $derived(
    all.filter(agent => matchesFilter(agent, filter) && matchesSearch(agent, search)),
  );
  const outcomes = $derived(
    stats.data ? sumOutcomes([...stats.data.values()].map(item => item.outcomes)) : null,
  );

  const FILTER_LABEL = {
    all: messages.filterAll,
    online: messages.filterOnline,
    offline: messages.filterOffline,
    never: messages.filterNever,
    disabled: messages.filterDisabled,
  } as const;

  const filters = $derived(
    phone.current
      ? AGENT_FILTERS.filter(
          value => value !== 'disabled' || counts.disabled > 0 || filter === 'disabled',
        )
      : AGENT_FILTERS,
  );
  const filterLabel = (value: AgentFilter) =>
    phone.current && value === 'never' ? messages.filterNeverShort : FILTER_LABEL[value];

  const accessLabel = (value: AgentAccess | undefined) => {
    if (!value) return '';
    if (value.kind === 'all') return t(messages.allProjects);
    if (value.kind === 'none') return t(messages.noProject);
    return value.projects.map(project => project.name).join(', ');
  };

  const openAgent = (id: string) => scyllaNavigate.goToWorkspaceRoute(`/agents/${id}`);
  const join = (agent: AppEntity) => {
    joining = agent;
    addOpen = true;
  };
</script>

{#snippet blurb()}
  <p class="text-sm text-muted-foreground">{t(messages.blurb)}</p>
{/snippet}

<div class="flex h-full min-h-0 w-full flex-col gap-6" data-tour="agents">
  <FeatureHeader
    label={t(messages.agent)}
    pluralLabel={t(messages.agents)}
    count={agents.data?.length}
    underLabel={blurb}
    onNew={() => {
      joining = null;
      addOpen = true;
    }}
    newLabel={t(messages.add)}
    canNew={canCreate}
    newDeniedReason={t(messages.onlyAdmins)}
  />

  {#if agents.isError}
    <ErrorState message={agents.error?.message} />
  {:else if agents.isPending}
    <ListSkeleton rows={4} rowClass="h-16 w-full rounded-xl" />
  {:else if all.length === 0}
    <EmptyList
      icon={BotIcon}
      title={canCreate ? t(messages.firstTitle) : t(messages.emptyTitle)}
      body={canCreate ? t(messages.firstBody) : t(messages.askAdmin)}
      addLabel={t(messages.add)}
      onAdd={canCreate
        ? () => {
            joining = null;
            addOpen = true;
          }
        : undefined}
    />
  {:else}
    {#if phone.current}
      <p class="text-xs text-muted-foreground">
        {t(messages.phoneOnline(summary.online, summary.total))} ·
        {t(messages.jobsRunning(summary.runningJobs))}
      </p>
    {:else}
      <AgentStatCards {summary} {outcomes} />
    {/if}

    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <ToggleGroup
        type="single"
        value={filter}
        onValueChange={next => {
          if (next) filter = next as AgentFilter;
        }}
        aria-label={t(messages.filterLabel)}
        class="w-fit max-w-full flex-wrap rounded-lg bg-muted p-1"
      >
        {#each filters as value (value)}
          <ToggleGroupItem
            {value}
            size="sm"
            class="h-auto gap-1.5 rounded-md px-2 py-1 text-sm sm:px-3 font-normal text-muted-foreground data-[state=on]:bg-card data-[state=on]:font-medium data-[state=on]:text-foreground data-[state=on]:shadow-xs"
          >
            {t(filterLabel(value))}
            <span class="tabular-nums">{counts[value]}</span>
          </ToggleGroupItem>
        {/each}
      </ToggleGroup>
      <div class="relative md:w-72">
        <SearchIcon
          class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          class="pl-9"
          placeholder={t(messages.search)}
          aria-label={t(messages.search)}
          bind:value={search}
        />
      </div>
    </div>

    {#if phone.current}
      <div class="flex flex-col gap-3">
        {#each shown as agent (agent.id)}
          {@const agentStats = stats.data?.get(agent.id)}
          <AgentCard
            {agent}
            access={canReadAccess ? accessLabel(access.data?.get(agent.id)) : ''}
            jobs={agentStats ? dailyJobs(agentStats) : []}
            total={agentStats ? endedJobs(agentStats.outcomes) : 0}
            onOpen={() => openAgent(agent.id)}
            onShowCommand={canCreate ? () => join(agent) : undefined}
          />
        {:else}
          <p class="py-8 text-center text-sm text-muted-foreground">{t(messages.noMatch)}</p>
        {/each}
      </div>
    {:else}
    <div class="relative overflow-x-auto rounded-xl border">
      <table class="w-full text-sm">
        <TableHeader>
          <TableRow class="hover:bg-transparent">
            <TableHead class="px-6">{t(messages.columnAgent)}</TableHead>
            <TableHead>{t(messages.columnStatus)}</TableHead>
            {#if canReadAccess}
              <TableHead>{t(messages.columnAccess)}</TableHead>
            {/if}
            <TableHead>{t(messages.columnJobs)}</TableHead>
            <TableHead class="w-12"><span class="sr-only">{t(messages.columnActions)}</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each shown as agent (agent.id)}
            {@const agentStats = stats.data?.get(agent.id)}
            {@const total = agentStats ? endedJobs(agentStats.outcomes) : 0}
            <TableRow>
              <TableCell class="px-6 py-3">
                <button
                  type="button"
                  class="flex flex-col items-start text-left"
                  onclick={() => openAgent(agent.id)}
                >
                  <span class="font-mono font-medium hover:underline">{agent.name}</span>
                  <span class="text-xs text-muted-foreground">
                    {agent.host?.hostname ?? t(messages.neverSaidHello)}
                  </span>
                </button>
              </TableCell>
              <TableCell class="py-3">
                <AgentStatusCell
                  {agent}
                  onShowCommand={canCreate ? () => join(agent) : undefined}
                />
              </TableCell>
              {#if canReadAccess}
                <TableCell class="py-3">{accessLabel(access.data?.get(agent.id))}</TableCell>
              {/if}
              <TableCell class="py-3">
                {#if agentStats && total > 0}
                  <span class="flex items-center gap-3">
                    <Sparkline values={dailyJobs(agentStats)} label={t(messages.jobsTotal(total))} />
                    <span class="font-mono tabular-nums">{total}</span>
                  </span>
                {:else}
                  <span class="text-muted-foreground" title={t(messages.noJob)}>–</span>
                {/if}
              </TableCell>
              <TableCell class="py-3 pr-4 text-right">
                <AppRowMenu
                  app={agent}
                  openLabel={t(messages.openAgent)}
                  onOpen={() => openAgent(agent.id)}
                  onNewCode={canCreate ? () => join(agent) : undefined}
                  onDisable={canManage ? () => (disabling = agent) : undefined}
                  onEnable={canManage ? () => enable.mutate(agent.id) : undefined}
                  onDelete={canManage ? () => (deleting = agent) : undefined}
                />
              </TableCell>
            </TableRow>
          {:else}
            <TableRow class="hover:bg-transparent">
              <TableCell colspan={canReadAccess ? 5 : 4} class="px-6 py-8 text-center text-muted-foreground">
                {t(messages.noMatch)}
              </TableCell>
            </TableRow>
          {/each}
        </TableBody>
      </table>
    </div>
    {/if}
  {/if}
</div>

{#if workspaceId}
  <AddAgentDialog
    open={addOpen}
    setOpen={open => {
      addOpen = open;
      if (!open) joining = null;
    }}
    {workspaceId}
    agent={joining}
  />
{/if}

<ConfirmOperationAlertDialog
  open={!!disabling}
  onOpenChange={open => {
    if (!open) disabling = null;
  }}
  title={t(messages.disableTitle(disabling?.name ?? ''))}
  description={t(messages.disableBody)}
  continueLabel={t(messages.disable)}
  isLoading={disable.isPending}
  onContinue={() => {
    if (disabling) disable.mutate(disabling.id, { onSuccess: () => (disabling = null) });
  }}
/>

<ConfirmOperationAlertDialog
  open={!!deleting}
  onOpenChange={open => {
    if (!open) deleting = null;
  }}
  title={t(messages.deleteTitle(deleting?.name ?? ''))}
  description={t(messages.deleteBody)}
  continueLabel={t(messages.delete)}
  isLoading={remove.isPending}
  onContinue={() => {
    if (deleting) remove.mutate(deleting.id, { onSuccess: () => (deleting = null) });
  }}
/>
