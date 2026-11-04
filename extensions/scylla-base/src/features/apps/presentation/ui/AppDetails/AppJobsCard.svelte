<script lang="ts">
  import { createQuery } from '@scylla/core-sdk';
  import { ListSkeleton } from '@scylla/ui';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { activeWorkspaceSlug } from '@platform/context';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import { appStatsOf } from '@base/features/apps/domain/structs/app-stats.struct.ts';
  import { appQueries } from '@base/features/apps/presentation/apps.queries.ts';
  import { appsMessages } from '@base/features/apps/presentation/messages/apps.messages.ts';

  interface Props {
    appId: string;
    workspaceId: string;
    /** `list_workspace_jobs` on the workspace. */
    canRead: boolean;
  }

  let { appId, workspaceId, canRead }: Props = $props();

  const jobs = createQuery(() => appQueries.jobs(workspaceId, appId, canRead));
  const stats = $derived(appStatsOf(jobs.data ?? []));

  const jobHref = (projectId: string, pipelineId: string, jobId: string) =>
    `/${activeWorkspaceSlug() ?? ''}/projects/${projectId}/pipelines/${pipelineId}/jobs/${jobId}`;
</script>

{#if canRead}
  <Card>
    <CardHeader>
      <CardTitle><h2>{t(appsMessages.recentJobs)}</h2></CardTitle>
      {#if stats.total > 0}
        <CardDescription>{t(appsMessages.stats(stats.completed, stats.failed))}</CardDescription>
      {/if}
    </CardHeader>
    <CardContent>
      {#if jobs.isPending}
        <ListSkeleton rows={4} rowClass="h-5 w-full" />
      {:else if (jobs.data ?? []).length === 0}
        <p class="text-sm text-muted-foreground">{t(appsMessages.noJobs)}</p>
      {:else}
        <ul class="flex flex-col divide-y text-sm">
          {#each jobs.data ?? [] as job (job.id)}
            <li class="flex items-center gap-3 py-1.5">
              <a
                class="min-w-0 flex-1 truncate font-mono text-xs hover:underline"
                href={jobHref(job.projectId, job.pipelineId, job.id)}
              >
                {job.id}
              </a>
              <span class="text-xs">{job.status}</span>
              <span class="text-xs text-muted-foreground">{getRelativeTime(job.createdAt)}</span>
            </li>
          {/each}
        </ul>
      {/if}
    </CardContent>
  </Card>
{/if}
