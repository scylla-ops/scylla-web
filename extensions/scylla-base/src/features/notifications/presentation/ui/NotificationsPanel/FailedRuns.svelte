<script lang="ts">
  import CircleXIcon from '@lucide/svelte/icons/circle-x';
  import { jobQueries } from '@base/features/jobs';
  import { pipelineQueries } from '@base/features/pipeline';
  import { can, Permission } from '@platform/authz';
  import { navigateTo, workspaceUrl } from '@platform/context';
  import { createQuery } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import { notificationMessages as messages } from '../../messages/notifications.messages.ts';

  const SHOWN = 5;

  interface Props {
    workspaceId: string;
    slug: string;
    onNavigate: () => void;
  }

  let { workspaceId, slug, onNavigate }: Props = $props();

  const jobs = createQuery(() => jobQueries.byWorkspace(workspaceId, true));
  const pipelines = createQuery(() => ({
    ...pipelineQueries.byWorkspace(workspaceId),
    enabled: can(Permission.LIST_PIPELINES_BY_WORKSPACE, { workspaceId }),
  }));

  const pipelineOf = (id: string) => pipelines.data?.items.find(pipeline => pipeline.id === id);

  const failed = $derived(
    (jobs.data?.items ?? [])
      .filter(job => job.status === 'failed' && pipelineOf(job.pipelineId))
      .slice(0, SHOWN),
  );

  const openJob = (pipelineId: string, jobId: string) => {
    const pipeline = pipelineOf(pipelineId);
    if (!pipeline) return;
    navigateTo(
      workspaceUrl(slug, `projects/${pipeline.projectId}/pipelines/${pipelineId}/jobs/${jobId}`),
    );
    onNavigate();
  };
</script>

<ul class="flex flex-col">
  {#each failed as job (job.id)}
    <li>
      <button
        type="button"
        class="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent/50"
        onclick={() => openJob(job.pipelineId, job.id)}
      >
        <CircleXIcon class="size-4 shrink-0 text-status-failed" aria-hidden="true" />
        <span class="min-w-0 flex-1 truncate">{pipelineOf(job.pipelineId)?.name}</span>
        <span class="shrink-0 text-xs text-muted-foreground">{getRelativeTime(job.createdAt)}</span>
      </button>
    </li>
  {:else}
    <li class="px-2 py-6 text-center text-sm text-muted-foreground">
      {t(messages.noFailedRun)}
    </li>
  {/each}
</ul>
