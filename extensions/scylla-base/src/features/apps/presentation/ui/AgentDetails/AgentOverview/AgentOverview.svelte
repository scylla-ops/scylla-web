<script lang="ts">
  import { createQuery } from '@scylla/core-sdk';
  import { projectQueries } from '@base/features/project';
  import type { AgentPage } from '../agent-page.state.svelte.ts';
  import AgentConnectCard from '../AgentConnectCard.svelte';
  import AgentRecentJobsCard from '../AgentRecentJobsCard.svelte';
  import AgentStatsRow from '../AgentStatsRow.svelte';
  import AgentAccessSummary from './AgentAccessSummary.svelte';
  import AgentMachineSummary from './AgentMachineSummary.svelte';
  import AgentNowCard from './AgentNowCard.svelte';
  import AgentRecentActivity from './AgentRecentActivity.svelte';

  interface Props {
    page: AgentPage;
    /** The next step of an agent with no job. */
    emptyAction: { label: string; onSelect: () => void };
  }

  let { page, emptyAction }: Props = $props();

  const agent = $derived(page.agent!);
  const stats = $derived(page.stats);

  const projects = createQuery(() => projectQueries.lookup(page.workspaceId));
  const projectName = (id: string) =>
    projects.data?.items.find(project => project.id === id)?.name ?? '';
</script>

<!-- The main facts on the left, the details of the agent on the right: on a phone, one column. -->
<div class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
  <div class="flex min-w-0 flex-col gap-4">
    {#if page.never && page.canNewCode}
      <AgentConnectCard onConnect={page.connect} />
    {:else if !page.never}
      <AgentNowCard {agent} jobs={page.recentJobs} {projectName} />
    {/if}
    {#if page.canReadStats && stats.level !== 'none'}
      <AgentStatsRow
        stats={stats.stats}
        lastRunAt={page.recentJobs?.[0]?.createdAt}
        period={stats.period}
        today={stats.today}
      />
    {/if}
    {#if page.canReadJobs}
      <AgentRecentJobsCard
        jobs={page.recentJobs}
        {projectName}
        onAll={() => page.tab.select('jobs')}
        {emptyAction}
      />
    {/if}
  </div>
  <aside class="flex min-w-0 flex-col gap-4">
    <AgentMachineSummary {agent} onDetails={() => page.tab.select('machine')} />
    <AgentAccessSummary
      {agent}
      access={page.access}
      canReadAccess={page.canReadAccess}
      workspaceName={page.workspaceName}
      onManage={() => page.tab.select('settings')}
    />
    {#if page.canReadStats && stats.timeline?.stats}
      <AgentRecentActivity
        stats={stats.timeline.stats}
        today={stats.today}
        joined={stats.joined}
        disabled={stats.disabled}
        onOpen={() => page.tab.select('activity')}
      />
    {/if}
  </aside>
</div>
