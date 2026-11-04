<script lang="ts">
  import type { MessageDescriptor } from '@lingui/core';
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import CircleXIcon from '@lucide/svelte/icons/circle-x';
  import CircleSlashIcon from '@lucide/svelte/icons/circle-slash';
  import ClockIcon from '@lucide/svelte/icons/clock';
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
  import { activeWorkspaceSlug } from '@platform/context';
  import { createQuery } from '@scylla/core-sdk';
  import { ListSkeleton } from '@scylla/ui';
  import { Card, CardContent, CardHeader, CardTitle } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { JobStatus } from '@shared/domain/structs/job-status.struct.ts';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
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

  const STATUS: Record<JobStatus, { label: MessageDescriptor; icon: typeof ClockIcon; tone: string }> = {
    pending: { label: messages.pending, icon: ClockIcon, tone: 'text-muted-foreground' },
    running: { label: messages.running, icon: LoaderCircleIcon, tone: 'text-warning' },
    completed: { label: messages.passed, icon: CircleCheckIcon, tone: 'text-primary' },
    failed: { label: messages.failed, icon: CircleXIcon, tone: 'text-destructive' },
    cancelled: { label: messages.cancelled, icon: CircleSlashIcon, tone: 'text-muted-foreground' },
    orphaned: { label: messages.orphaned, icon: CircleSlashIcon, tone: 'text-chart-2' },
    unknown: { label: messages.unknown, icon: ClockIcon, tone: 'text-muted-foreground' },
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
          {@const status = STATUS[job.status]}
          <li class="flex items-center gap-3">
            <span class="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs">
              <status.icon class={cn('size-3.5', status.tone)} aria-hidden="true" />
              {t(status.label)}
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
