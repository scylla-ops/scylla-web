<script lang="ts">
  import type { MessageDescriptor } from '@lingui/core';
  import { activeWorkspaceSlug } from '@platform/context';
  import { createQuery } from '@scylla/core-sdk';
  import { ListSkeleton, StatusShape } from '@scylla/ui';
  import { Card, CardContent, CardHeader, CardTitle } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { JobStatus } from '@shared/domain/structs/job-status.struct.ts';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import { toStatusState } from '@shared/utils/job-status.utils.ts';
  import { projectQueries } from '@base/features/project';
  import type { AppJob } from '@base/features/apps/domain/entities/app.entity.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';

  interface Props {
    workspaceId: string;
    /** Newest first. `undefined` while they load. */
    jobs: AppJob[] | undefined;
  }

  let { workspaceId, jobs }: Props = $props();

  const SHOWN = 5;

  const projects = createQuery(() => projectQueries.lookup(workspaceId));
  const projectName = (id: string) =>
    projects.data?.items.find(project => project.id === id)?.name ?? '';

  const STATUS_LABEL: Record<JobStatus, MessageDescriptor> = {
    pending: messages.pending,
    running: messages.running,
    completed: messages.passed,
    failed: messages.failed,
    cancelled: messages.cancelled,
    orphaned: messages.orphaned,
    unknown: messages.unknown,
  };

  const jobHref = (job: AppJob) =>
    `/${activeWorkspaceSlug() ?? ''}/projects/${job.projectId}/pipelines/${job.pipelineId}/jobs/${job.id}`;
</script>

<Card class="h-full">
  <CardHeader>
    <CardTitle><h2>{t(messages.recentJobs)}</h2></CardTitle>
  </CardHeader>
  <CardContent>
    {#if jobs === undefined}
      <ListSkeleton rows={4} rowClass="h-6 w-full" />
    {:else if jobs.length === 0}
      <p class="text-sm text-muted-foreground">{t(messages.noJob)}</p>
    {:else}
      <ul class="flex flex-col gap-3 text-sm">
        {#each jobs.slice(0, SHOWN) as job (job.id)}
          {@const label = t(STATUS_LABEL[job.status])}
          <li class="flex items-center gap-3">
            <span class="inline-flex items-center gap-1.5 text-xs">
              <StatusShape state={toStatusState(job.status)} {label} size={20} />
              <span aria-hidden="true">{label}</span>
            </span>
            <a class="min-w-0 flex-1 truncate hover:underline" href={jobHref(job)}>
              {projectName(job.projectId)}
              <span class="font-mono text-xs text-muted-foreground">#{job.id.slice(-6)}</span>
            </a>
            <span class="text-xs text-muted-foreground">{getRelativeTime(job.createdAt)}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </CardContent>
</Card>
