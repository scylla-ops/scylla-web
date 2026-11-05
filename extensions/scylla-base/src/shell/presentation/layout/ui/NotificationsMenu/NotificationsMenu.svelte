<script lang="ts">
  import BellIcon from '@lucide/svelte/icons/bell';
  import CircleXIcon from '@lucide/svelte/icons/circle-x';
  import { can, Permission } from '@platform/authz';
  import { contextStore, navigateTo, workspaceUrl } from '@platform/context';
  import { createQuery } from '@scylla/core-sdk';
  import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
  } from '@scylla/ui/primitives';
  import { toRune } from '@scylla/ui/stores';
  import { t } from '@scylla/ui/i18n';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import { jobQueries } from '@base/features/jobs';
  import { pipelineQueries } from '@base/features/pipeline';
  import { layoutMessages } from '@base/shell/presentation/layout/messages/layout.messages.ts';

  const SHOWN = 5;

  const context = toRune(contextStore);
  const workspace = $derived(context().workspace);
  const workspaceId = $derived(workspace.id);
  const target = $derived({ workspaceId: workspaceId ?? undefined });

  let open = $state(false);

  // Read when the menu opens: the top bar is on each page.
  const jobs = createQuery(() =>
    jobQueries.byWorkspace(workspaceId, open && can(Permission.LIST_JOBS_BY_WORKSPACE, target)),
  );
  const pipelines = createQuery(() => ({
    ...pipelineQueries.byWorkspace(workspaceId),
    enabled: open && !!workspaceId && can(Permission.LIST_PIPELINES_BY_WORKSPACE, target),
  }));

  const pipelineOf = (id: string) => pipelines.data?.items.find(pipeline => pipeline.id === id);

  const failed = $derived(
    (jobs.data?.items ?? [])
      .filter(job => job.status === 'failed' && pipelineOf(job.pipelineId))
      .slice(0, SHOWN),
  );

  const openJob = (pipelineId: string, jobId: string) => {
    const pipeline = pipelineOf(pipelineId);
    if (!pipeline || !workspace.slug) return;
    navigateTo(
      workspaceUrl(
        workspace.slug,
        `projects/${pipeline.projectId}/pipelines/${pipelineId}/jobs/${jobId}`,
      ),
    );
  };
</script>

<DropdownMenu bind:open>
  <DropdownMenuTrigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="outline"
        size="icon"
        class="size-8 shrink-0 rounded-lg data-[state=open]:bg-accent"
        aria-label={t(layoutMessages.notifications)}
      >
        <BellIcon class="size-4" aria-hidden="true" />
      </Button>
    {/snippet}
  </DropdownMenuTrigger>
  <DropdownMenuContent
    class="w-72 rounded-xl border-border bg-popover p-1 shadow-lg"
    side="bottom"
    align="end"
    sideOffset={4}
  >
    <DropdownMenuLabel class="px-2 py-1 text-xs font-normal text-muted-foreground">
      {t(layoutMessages.failedRuns)}
    </DropdownMenuLabel>
    {#each failed as job (job.id)}
      <DropdownMenuItem
        class="cursor-pointer gap-2 px-2 py-1.5"
        onSelect={() => openJob(job.pipelineId, job.id)}
      >
        <CircleXIcon class="size-4 shrink-0 text-status-failed" aria-hidden="true" />
        <span class="min-w-0 flex-1 truncate">{pipelineOf(job.pipelineId)?.name}</span>
        <span class="shrink-0 text-xs text-muted-foreground">{getRelativeTime(job.createdAt)}</span>
      </DropdownMenuItem>
    {:else}
      <p class="px-2 py-4 text-center text-sm text-muted-foreground">
        {t(layoutMessages.noFailedRun)}
      </p>
    {/each}
  </DropdownMenuContent>
</DropdownMenu>
