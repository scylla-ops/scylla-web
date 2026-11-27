<script lang="ts">
  import { activeWorkspaceSlug } from '@platform/context';
  import { enter, StatusShape } from '@scylla/ui';
  import { jobShortId } from '@shared/presentation/ui';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import { toStatusState } from '@shared/utils/job-status.utils.ts';
  import type { AppJob } from '@base/features/apps/domain/entities/app.entity.ts';
  import {
    jobDuration,
    jobStatusLabel,
  } from '@base/features/apps/presentation/presenters/agent-jobs.presenter.ts';

  interface Props {
    job: AppJob;
    projectName: string;
    /** Shows how long the job ran, on a wide screen. */
    withDuration?: boolean;
  }

  let { job, projectName, withDuration = false }: Props = $props();

  const label = $derived(jobStatusLabel(job.status));
  const duration = $derived(withDuration ? jobDuration(job) : null);
  const href = $derived(
    `/${activeWorkspaceSlug() ?? ''}/projects/${job.projectId}/pipelines/${job.pipelineId}/jobs/${job.id}`,
  );
</script>

<!-- One job on one line: the state, the project and the number, then the times. A new row fades in. -->
<li
  in:enter
  class="grid min-h-9 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(6.5rem,auto)_minmax(0,1fr)_auto]"
>
  <!-- On a phone, the shape alone gives the state: its name is its accessible name. -->
  <span class="flex min-w-0 items-center gap-1.5 text-xs">
    <StatusShape state={toStatusState(job.status)} {label} size={20} />
    <span class="truncate max-sm:hidden" aria-hidden="true">{label}</span>
  </span>
  <a class="min-w-0 truncate hover:underline" {href}>
    {projectName}
    <span class="font-mono text-xs text-muted-foreground">#{jobShortId(job.id)}</span>
  </a>
  <span class="flex items-center gap-3 text-xs whitespace-nowrap text-muted-foreground">
    {#if duration}
      <span class="tabular-nums max-sm:hidden">{duration}</span>
    {/if}
    <span>{getRelativeTime(job.createdAt)}</span>
  </span>
</li>
