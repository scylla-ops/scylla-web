<script lang="ts">
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import { can, Permission } from '@platform/authz';
  import { contextStore, scyllaNavigate } from '@platform/context';
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { ConfirmOperationAlertDialog, ErrorState } from '@scylla/ui';
  import { Skeleton } from '@scylla/ui/primitives';
  import { toRune } from '@scylla/ui/stores';
  import { t } from '@scylla/ui/i18n';
  import { formatDay } from '@shared/utils/date-utils.ts';
  import { appStateOf } from '@base/features/apps/domain/entities/app.entity.ts';
  import { hasNoActiveKey } from '@base/features/apps/domain/structs/agent-list.struct.ts';
  import { appMutations, appQueries } from '@base/features/apps/presentation/apps.queries.ts';
  import AddAgentDialog from '../components/AddAgentDialog/AddAgentDialog.svelte';
  import AgentHeader from './AgentHeader.svelte';
  import AgentStatsRow from './AgentStatsRow.svelte';
  import JobsPerDayCard from './JobsPerDayCard.svelte';
  import AgentMachineCard from './AgentMachineCard.svelte';
  import AgentRecentJobsCard from './AgentRecentJobsCard.svelte';
  import AgentAccessCard from './AgentAccessCard.svelte';
  import AgentKeysCard from './AgentKeysCard.svelte';
  import AgentConnectCard from './AgentConnectCard.svelte';
  import AgentDangerZone from './AgentDangerZone.svelte';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';

  let { appId = '' }: { appId?: string } = $props();

  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id ?? '');
  const workspaceName = $derived(context().workspace.name ?? '');
  const target = $derived({ workspaceId });

  const canCreate = $derived(can(Permission.CREATE_APP, target));
  const canManage = $derived(can(Permission.DELETE_APP, target));
  const canReadAccess = $derived(can(Permission.LIST_WORKSPACE_MEMBERS, target));
  const canChangeAccess = $derived(
    can(Permission.MANAGE_WORKSPACE_GRANTS, target) && can(Permission.MANAGE_PROJECT_GRANTS, target),
  );
  const canReadJobs = $derived(can(Permission.LIST_JOBS_BY_WORKSPACE, target));

  const details = createQuery(() => appQueries.byId(appId, workspaceId));
  const stats = createQuery(() => appQueries.agentStatsOf(appId, workspaceId));
  const jobs = createQuery(() => appQueries.jobs(workspaceId, appId, canReadJobs));
  const access = createQuery(() =>
    appQueries.agentAccess(workspaceId, appId ? [appId] : [], canReadAccess),
  );

  const disable = createMutation(() => appMutations.disable());
  const enable = createMutation(() => appMutations.enable());

  const agent = $derived(details.data?.app);
  const never = $derived(!!agent && appStateOf(agent) === 'never' && !agent.disabledAt);

  let disabling = $state(false);
  let joining = $state(false);
</script>

{#if details.isError}
  <ErrorState message={details.error?.message} />
{:else if !agent}
  <div class="flex flex-col gap-4" aria-busy="true">
    <Skeleton class="h-12 w-72" />
    <Skeleton class="h-24 w-full rounded-xl" />
    <div class="grid gap-4 lg:grid-cols-3">
      <Skeleton class="h-64 w-full rounded-xl lg:col-span-2" />
      <Skeleton class="h-64 w-full rounded-xl" />
    </div>
  </div>
{:else}
  <div class="flex flex-col gap-6 pb-20" data-tour="agent-details">
    <AgentHeader
      {agent}
      noActiveKey={hasNoActiveKey(details.data?.keys ?? [])}
      onDisable={canManage ? () => (disabling = true) : undefined}
      onEnable={canManage ? () => enable.mutate(agent.id) : undefined}
      enabling={enable.isPending}
    />

    {#if agent.disabledAt}
      <div
        class="flex items-start gap-3 rounded-xl border border-warning/60 bg-warning/10 p-4"
        role="status"
      >
        <TriangleAlertIcon class="mt-0.5 size-4 text-warning" aria-hidden="true" />
        <div class="flex flex-col gap-1">
          <p class="text-sm font-medium">{t(messages.disabledSince(formatDay(agent.disabledAt)))}</p>
          <p class="text-xs text-muted-foreground">{t(messages.disabledBody)}</p>
        </div>
      </div>
    {/if}

    {#if never && canCreate}
      <AgentConnectCard
        agentId={agent.id}
        {workspaceId}
        keyCount={details.data?.keys.length ?? 0}
      />
    {:else if !never}
      <AgentStatsRow stats={stats.data} lastRunAt={jobs.data?.[0]?.createdAt} />
      <div class="grid gap-4 lg:grid-cols-3">
        <div class="lg:col-span-2">
          {#if stats.data}
            <JobsPerDayCard stats={stats.data} />
          {:else}
            <Skeleton class="h-64 w-full rounded-xl" />
          {/if}
        </div>
        <AgentMachineCard {agent} />
      </div>
    {/if}

    <div class="grid gap-4 lg:grid-cols-3">
      <div class="lg:col-span-2">
        {#if canReadJobs}
          <AgentRecentJobsCard {workspaceId} jobs={jobs.data} />
        {/if}
      </div>
      {#if canReadAccess}
        <AgentAccessCard
          agentId={agent.id}
          {workspaceId}
          {workspaceName}
          access={access.data?.get(agent.id)}
          canChange={canChangeAccess}
        />
      {/if}
    </div>

    <AgentKeysCard
      agentId={agent.id}
      keys={details.data?.keys ?? []}
      onNewCode={canCreate && !agent.disabledAt ? () => (joining = true) : undefined}
      canManage={canCreate}
      tourAnchor={!never || !canCreate}
    />

    {#if canManage}
      <AgentDangerZone
        agentId={agent.id}
        agentName={agent.name}
        os={agent.host?.os}
        onDeleted={() => scyllaNavigate.goToWorkspaceRoute('/agents')}
      />
    {/if}
  </div>

  <AddAgentDialog
    open={joining}
    setOpen={open => (joining = open)}
    {workspaceId}
    agent={joining ? agent : null}
  />

  <ConfirmOperationAlertDialog
    open={disabling}
    onOpenChange={open => (disabling = open)}
    title={t(messages.disableTitle(agent.name))}
    description={t(messages.disableBody)}
    continueLabel={t(messages.disable)}
    isLoading={disable.isPending}
    onContinue={() => disable.mutate(agent.id, { onSuccess: () => (disabling = false) })}
  />
{/if}
