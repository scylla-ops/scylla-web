<script lang="ts">
  import PowerOffIcon from '@lucide/svelte/icons/power-off';
  import TrashIcon from '@lucide/svelte/icons/trash';
  import { createResourceError, scyllaNavigate } from '@platform/context';
  import { Button, Card, Skeleton } from '@scylla/ui/primitives';
  import { ConfirmOperationAlertDialog, ErrorState } from '@scylla/ui';
  import { activeLocale, t } from '@scylla/ui/i18n';
  import {
    createAgentActions,
  } from '@base/features/agents/presentation/agent-actions.state.svelte.ts';
  import {
    createAgentDetails,
  } from '@base/features/agents/presentation/agent-details.state.svelte.ts';
  import { formatDayTime } from '@base/features/agents/presentation/utils/agent-format.ts';
  import AgentActionDialogs from '../components/AgentActionDialogs.svelte';
  import AgentRunCommand from '../components/AgentRunCommand/AgentRunCommand.svelte';
  import { agentsMessages } from '../agents.messages.ts';
  import AccessCard from './AccessCard/AccessCard.svelte';
  import AgentHeader from './AgentHeader.svelte';
  import HostCard from './HostCard.svelte';
  import JobsPerDayChart from './JobsPerDayChart.svelte';
  import KeyNumbersCard from './KeyNumbersCard.svelte';
  import RecentJobsCard from './RecentJobsCard.svelte';
  import SecretsCard from './SecretsCard.svelte';
  import { agentDetailsMessages as messages } from './agent-details.messages.ts';

  interface Props {
    agentId?: string;
  }

  let { agentId }: Props = $props();

  const details = createAgentDetails(() => agentId ?? '');
  const actions = createAgentActions({ onDeleted: () => scyllaNavigate.navigate('..') });

  const resourceError = createResourceError({
    error: () => details.agentQuery.error,
    redirectTo: '..',
    notFoundMessage: t(messages.notFound),
  });
</script>

{#if resourceError.redirecting}
  <!-- The redirect is in flight. -->
{:else if details.agentQuery.isLoading}
  <Skeleton class="m-4 h-72 rounded-xl" />
{:else if details.agentQuery.isError || !details.agent || !details.state}
  <ErrorState message={t(messages.loadError)} />
{:else}
  {@const agent = details.agent}
  {@const state = details.state}
  <div data-tour="agent-details" class="flex w-full flex-col gap-5 pb-8">
    <AgentHeader {agent} {state} now={details.now} {actions} />

    {#if state === 'disabled'}
      <div class="flex items-start gap-3 rounded-xl border bg-card px-4 py-3" role="status">
        <PowerOffIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <p class="text-sm font-medium">{t(messages.disabledTitle)}</p>
          <p class="text-sm text-muted-foreground">
            {t(messages.disabledBody(formatDayTime(agent.updatedAt, activeLocale())))}
          </p>
        </div>
        {#if actions.canToggle}
          <Button size="sm" onclick={() => actions.enable(agent)} disabled={actions.isToggling}>
            {t(agentsMessages.enable)}
          </Button>
        {/if}
      </div>
    {/if}

    <div class="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div class="flex min-w-0 flex-col gap-5">
        {#if state === 'never'}
          <Card data-tour="agent-run" class="gap-4 px-5 py-5">
            <div class="flex flex-col gap-1">
              <h2 class="text-sm font-semibold">{t(messages.runThisAgent)}</h2>
              <p class="text-xs text-muted-foreground">{t(messages.runThisAgentBody)}</p>
            </div>
            <AgentRunCommand appId={agent.id} secret={null} />
          </Card>
        {/if}

        {#if details.canReadStats}
          <KeyNumbersCard
            stats={details.stats}
            outcomes={details.outcomes}
            successRate={details.successRate}
            now={details.now}
          />
          {#if details.stats}
            <JobsPerDayChart stats={details.stats} now={details.now} />
          {:else}
            <Skeleton class="h-64 w-full rounded-xl" />
          {/if}
        {/if}

        {#if details.canListJobs}
          <RecentJobsCard
            rows={details.recentJobs}
            loading={details.jobsLoading}
            now={details.now}
            canOpen={details.canOpenJob}
            onOpen={details.openJob}
          />
        {/if}
      </div>

      <div class="flex min-w-0 flex-col gap-5">
        <HostCard host={agent.host} now={details.now} />
        <AccessCard
          {agent}
          access={details.access}
          loading={details.accessLoading}
          organizationId={details.organizationId}
        />
        <SecretsCard
          secrets={details.secrets}
          loading={details.secretsLoading}
          canManage={details.canManageSecrets}
          onToggle={details.toggleSecret}
          onRevoke={details.requestRevoke}
        />
        {#if actions.canDelete}
          <Card class="gap-3 border-destructive/70 px-5 py-5">
            <div class="flex flex-col gap-1">
              <h2 class="text-sm font-semibold">{t(messages.deleteThisAgent)}</h2>
              <p class="text-xs text-muted-foreground">{t(messages.deleteConsequence)}</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              class="self-start"
              onclick={() => actions.requestDelete(agent)}
            >
              <TrashIcon />
              {t(agentsMessages.deleteAgent)}
            </Button>
          </Card>
        {/if}
      </div>
    </div>

    <AgentActionDialogs {actions} />

    <ConfirmOperationAlertDialog
      open={details.revoking !== null}
      onOpenChange={open => {
        if (!open) details.cancelRevoke();
      }}
      onContinue={details.confirmRevoke}
      isLoading={details.isRevoking}
      title={t(messages.revokeTitle(details.revoking?.label ?? ''))}
      description={t(messages.revokeBody)}
      continueLabel={t(messages.revoke)}
    />
  </div>
{/if}
