<script lang="ts">
  import { Permission, can } from '@platform/authz';
  import { createResourceError } from '@platform/context';
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { Skeleton } from '@scylla/ui/primitives';
  import { ErrorState } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { isFinishedStatus } from '@shared/domain/structs/job-status.struct.ts';
  import { jobMutations, jobQueries } from '@base/features/jobs/presentation/jobs.queries.ts';
  import { createLogDisplay } from '@base/features/jobs/presentation/ui/jobs-log/log-display-settings.state.svelte.ts';
  import { nodeIdOf } from '@base/features/jobs/presentation/presenters/job-timeline.presenter.ts';
  import { stepsOf } from '@base/features/jobs/presentation/presenters/job-steps.presenter.ts';
  import { jobsMessages } from '@base/features/jobs/presentation/messages/jobs.messages.ts';
  import { createJobLogPlace } from './job-log-place.state.svelte.ts';
  import JobAlerts from './JobAlerts.svelte';
  import JobHeader from './JobHeader.svelte';
  import JobLogWorkspace from './JobLogWorkspace/JobLogWorkspace.svelte';

  interface Props {
    jobId?: string;
  }

  let { jobId }: Props = $props();

  const jobQuery = createQuery(() => jobQueries.byId(jobId ?? ''));
  const job = $derived(jobQuery.data);

  const rerun = createMutation(() => jobMutations.rerun(job?.pipelineId ?? ''));
  const canRerun = $derived(
    !!job && isFinishedStatus(job.status) && can(Permission.CREATE_JOB),
  );

  const approve = createMutation(() => jobMutations.approve(job?.pipelineId ?? ''));
  const reject = createMutation(() => jobMutations.reject(job?.pipelineId ?? ''));
  const canApprove = $derived(!!job && can(Permission.APPROVE_JOB));
  const canViewLogs = $derived(can(Permission.READ_JOB_LOGS));

  // A getter: the nodes arrive with the job. The checkout is a step before them.
  const place = createJobLogPlace(() => (job ? stepsOf(job).map(nodeIdOf) : []));
  const display = createLogDisplay();

  const resourceError = createResourceError({
    error: () => jobQuery.error,
    redirectTo: '..',
    notFoundMessage: t(jobsMessages.jobNotFound),
  });
</script>

<!-- The node of the log and the full screen are in the URL. The page fills the viewport and only the log scrolls. -->
{#if !jobId}
  <ErrorState message={t(jobsMessages.jobIdMissing)} />
{:else if resourceError.redirecting}
  <!-- The redirect is in flight. -->
{:else if jobQuery.isLoading}
  <Skeleton class="h-72 w-full rounded-xl" />
{:else if jobQuery.isError || !job}
  <ErrorState message={t(jobsMessages.jobLoadError)} />
{:else}
  <div data-tour="job-details" class="flex h-full min-h-0 w-full flex-col gap-3">
    <JobHeader
      {job}
      onRerun={canRerun ? () => rerun.mutate(job.id) : undefined}
      isRerunning={rerun.isPending}
    />
    <JobAlerts
      {job}
      onApprove={canApprove ? () => approve.mutate(job.id) : undefined}
      onReject={canApprove ? () => reject.mutate(job.id) : undefined}
      isDeciding={approve.isPending || reject.isPending}
    />
    {#if canViewLogs}
      <JobLogWorkspace {job} {place} {display} />
    {:else}
      <p class="text-sm italic text-muted-foreground">{t(jobsMessages.logsDenied)}</p>
    {/if}
  </div>
{/if}
