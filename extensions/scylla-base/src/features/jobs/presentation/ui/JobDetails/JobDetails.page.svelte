<script lang="ts">
  import { Permission, can } from '@platform/authz';
  import { createResourceError } from '@platform/context';
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { Skeleton } from '@scylla/ui/primitives';
  import { ErrorState } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { isFinishedStatus } from '@shared/domain/structs/job-status.struct.ts';
  import { jobMutations, jobQueries } from '@base/features/jobs/presentation/jobs.queries.ts';
  import { createOpenLogPanels } from './open-log-panels.state.svelte.ts';
  import JobGraph from './JobGraph/JobGraph.svelte';
  import JobNodeLogs from './JobNodeLogs.svelte';
  import JobSummary from './JobSummary.svelte';
  import { nodeIdOf } from '@base/features/jobs/presentation/presenters/job-timeline.presenter.ts';
  import { jobsMessages } from '@base/features/jobs/presentation/messages/jobs.messages.ts';

  interface Props {
    jobId?: string;
  }

  let { jobId }: Props = $props();

  const jobQuery = createQuery(() => jobQueries.byId(jobId ?? ''));
  const job = $derived(jobQuery.data);

  const rerun = createMutation(() => jobMutations.rerun(job?.pipelineId ?? ''));
  const canRerun = $derived(
    !!job && isFinishedStatus(job.status) && can(Permission.RUN_PIPELINE),
  );

  // A getter: the nodes arrive with the job.
  const panels = createOpenLogPanels(() => job?.nodeExecutions.map(nodeIdOf) ?? []);

  /** A node picked in the graph: its panel opens, and the list scrolls to it. */
  let revealed = $state<{ id: string } | null>(null);
  const showNode = (nodeId: string) => {
    panels.selectNode(nodeId);
    revealed = { id: nodeId };
  };

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
  <div data-tour="job-details" class="flex h-full min-h-0 w-full flex-col gap-6">
    <JobSummary
      {job}
      onSelectNode={panels.selectNode}
      onRerun={canRerun ? () => rerun.mutate(job.id) : undefined}
      isRerunning={rerun.isPending}
    />
    <!-- A job from before the snapshot of the nodes has no graph. -->
    {#if job.nodes.length}
      <JobGraph {job} onSelectNode={showNode} />
    {/if}
    <JobNodeLogs
      {job}
      openNodeIds={panels.openNodeIds}
      isWholeJobOpen={panels.isWholeJobOpen}
      onToggleNode={panels.toggleNode}
      onShowWholeJob={() => panels.selectNode()}
      {revealed}
    />
  </div>
{/if}
