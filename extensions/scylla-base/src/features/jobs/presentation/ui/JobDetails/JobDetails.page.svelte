<script lang="ts">
  import { createResourceError } from '@platform/context';
  import { createQuery } from '@scylla/core-sdk';
  import { Skeleton } from '@scylla/ui/shadcn';
  import { ErrorState } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { jobQueries } from '../../jobs.queries.ts';
  import { createOpenLogPanels } from '../../open-log-panels.svelte.ts';
  import JobNodeLogs from '../job-details/JobNodeLogs.svelte';
  import JobSummary from '../job-details/JobSummary.svelte';
  import { nodeIdOf } from '../jobs-table/job-timeline.calculator.ts';
  import { jobsMessages } from '../jobs.messages.ts';

  interface Props {
    jobId?: string;
  }

  let { jobId }: Props = $props();

  const jobQuery = createQuery(() => jobQueries.byId(jobId ?? ''));
  const job = $derived(jobQuery.data);

  // A getter: the nodes arrive with the job.
  const panels = createOpenLogPanels(() => job?.nodeExecutions.map(nodeIdOf) ?? []);

  const resourceError = createResourceError({
    error: () => jobQuery.error,
    redirectTo: '..',
    notFoundMessage: t(jobsMessages.jobNotFound),
  });
</script>

<!-- The open log panels are in the URL. The page fills the viewport and the logs scroll inside it. -->
{#if !jobId}
  <ErrorState message={t(jobsMessages.jobIdMissing)} />
{:else if resourceError.redirecting}
  <!-- The redirect is in flight. -->
{:else if jobQuery.isLoading}
  <Skeleton class="h-72 w-full rounded-xl" />
{:else if jobQuery.isError || !job}
  <ErrorState message={t(jobsMessages.jobLoadError)} />
{:else}
  <div class="flex h-full min-h-0 w-full flex-col gap-6">
    <JobSummary {job} onSelectNode={panels.selectNode} />
    <JobNodeLogs
      {job}
      openNodeIds={panels.openNodeIds}
      isWholeJobOpen={panels.isWholeJobOpen}
      onToggleNode={panels.toggleNode}
      onShowWholeJob={() => panels.selectNode()}
    />
  </div>
{/if}
