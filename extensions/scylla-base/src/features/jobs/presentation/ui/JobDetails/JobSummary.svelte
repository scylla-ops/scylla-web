<script lang="ts">
  import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
  import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
  import { Permission, can } from '@platform/authz';
  import { activeWorkspaceSlug, contextStore } from '@platform/context';
  import { createQuery } from '@scylla/core-sdk';
  import { appQueries } from '@base/features/apps';
  import { Badge, Button } from '@scylla/ui/primitives';
  import { CopyableText } from '@scylla/ui';
  import { createNow } from '@scylla/ui/state';
  import { toRune } from '@scylla/ui/stores';
  import { t } from '@scylla/ui/i18n';
  import {
    calculateExecutionDuration,
    formatDate,
    formatDuration,
  } from '@shared/utils/date-utils.ts';
  import type { JobEntity } from '@base/features/jobs/domain/entities/job.entity.ts';
  import { isActiveStatus } from '@shared/domain/structs/job-status.struct.ts';
  import JobStatus from '../jobs-table/JobStatus/JobStatus.svelte';
  import JobTimeline from '../jobs-table/JobTimeline/JobTimeline.svelte';
  import { jobsMessages } from '@base/features/jobs/presentation/messages/jobs.messages.ts';
  import { stepsOf } from '@base/features/jobs/presentation/presenters/job-steps.presenter.ts';
  import { hasInvalidFile } from '@base/features/jobs/presentation/presenters/job-status.presenter.ts';
  import InvalidFileAlert from './InvalidFileAlert.svelte';
  import JobApprovalBlock from './JobApprovalBlock.svelte';
  import JobReportsBand from './JobReportsBand.svelte';
  import JobSourceFacts from './JobSourceFacts.svelte';

  interface Props {
    job: JobEntity;
    /** Shows that node alone. A grouped segment names no node: the whole job. */
    onSelectNode: (nodeId?: string) => void;
    onRerun?: () => void;
    isRerunning?: boolean;
    /** Unset without `APPROVE_JOB`. */
    onApprove?: () => void;
    onReject?: () => void;
    isDeciding?: boolean;
  }

  let {
    job,
    onSelectNode,
    onRerun,
    isRerunning = false,
    onApprove,
    onReject,
    isDeciding = false,
  }: Props = $props();

  // Ticks only while the job runs.
  const now = createNow(() => isActiveStatus(job.status));

  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id ?? '');
  const agent = createQuery(() => ({
    ...appQueries.byId(job.agentId ?? '', workspaceId),
    refetchInterval: false,
  }));

  // The agent page needs READ_APP: without it, the id stays plain text.
  const canOpenAgent = $derived(can(Permission.READ_APP, { workspaceId }));

  const duration = $derived.by(() => {
    void now.value;
    return calculateExecutionDuration(job.startedAt, job.finishedAt);
  });
</script>

{#snippet fact(label: string, value: string)}
  <span class="flex items-center gap-1.5">
    <span class="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
    <span class="font-mono text-xs text-foreground">{value}</span>
  </span>
{/snippet}

<div class="flex shrink-0 flex-col gap-4">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div class="flex min-w-0 items-center gap-3">
      <h1 class="text-foreground">{t(jobsMessages.job)}</h1>
      <Badge variant="outline" class="gap-1 pr-1 font-mono text-xs">
        <CopyableText value={job.id} copyLabel={t(jobsMessages.copyJobId)} />
      </Badge>
    </div>
    <div class="flex items-center gap-3">
      {#if onRerun}
        <Button variant="outline" size="sm" onclick={onRerun} disabled={isRerunning}>
          <RotateCcwIcon class="size-4" />
          {t(jobsMessages.rerun)}
        </Button>
      {/if}
      <div class="w-fit">
        <JobStatus {job} />
      </div>
    </div>
  </div>

  <div
    class="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-border bg-card px-3.5 py-2"
  >
    {@render fact(
      t(jobsMessages.duration),
      duration === null ? '-' : formatDuration(duration),
    )}
    <span class="text-muted-foreground/50">·</span>
    {@render fact(
      t(jobsMessages.startedPrefix),
      job.startedAt ? formatDate(job.startedAt) : '-',
    )}
    <span class="text-muted-foreground/50">·</span>
    {@render fact(
      t(jobsMessages.finishedPrefix),
      job.finishedAt ? formatDate(job.finishedAt) : '-',
    )}
    <span class="text-muted-foreground/50">·</span>
    {@render fact(t(jobsMessages.createdPrefix), formatDate(job.createdAt))}
    {#if job.agentId}
      <span class="text-muted-foreground/50">·</span>
      <span class="flex items-center gap-1.5">
        <span class="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {t(jobsMessages.agent)}
        </span>
        {#if canOpenAgent}
          <a
            class="font-mono text-xs text-foreground hover:underline"
            href="/{activeWorkspaceSlug() ?? ''}/agents/{job.agentId}"
          >
            {agent.data?.app.name ?? job.agentId}
          </a>
        {:else}
          <span class="font-mono text-xs text-foreground">{job.agentId}</span>
        {/if}
      </span>
    {/if}
  </div>

  {#if job.source}
    <JobSourceFacts {job} source={job.source} />
  {/if}

  <JobReportsBand {job} />

  {#if job.status === 'awaiting_approval' && job.approval}
    <JobApprovalBlock
      approval={job.approval}
      provider={job.source?.provider}
      {onApprove}
      {onReject}
      deciding={isDeciding}
    />
  {/if}

  {#if hasInvalidFile(job) && job.fileErrors}
    <InvalidFileAlert errors={job.fileErrors} file={job.pipelineFile} />
  {:else if job.error}
    <div
      role="alert"
      class="flex items-center gap-2.5 rounded-md border border-destructive/40 bg-destructive-subtle px-3.5 py-2.5"
    >
      <CircleAlertIcon class="size-4 shrink-0 text-destructive" aria-hidden="true" />
      <div class="min-w-0">
        <p class="text-sm font-medium text-foreground">{t(jobsMessages.jobFailed)}</p>
        <p class="mt-0.5 font-mono text-xs break-words text-foreground">{job.error}</p>
      </div>
    </div>
  {/if}

  <div>
    <h2 class="mb-2 text-lg text-foreground">{t(jobsMessages.timeline)}</h2>
    <JobTimeline nodeExecutions={stepsOf(job)} {onSelectNode} />
  </div>
</div>
