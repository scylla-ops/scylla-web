<script lang="ts">
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
  import { ListSkeleton } from '@scylla/ui';
  import { Button, Card, CardContent, CardHeader, CardTitle } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { AppJob } from '@base/features/apps/domain/entities/app.entity.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import AgentJobRow from './AgentJobRow.svelte';

  interface Props {
    /** Newest first. `undefined` while they load. */
    jobs: AppJob[] | undefined;
    projectName: (id: string) => string;
    /** Opens the tab of all the jobs. */
    onAll: () => void;
    /** The next step of an agent with no job. */
    emptyAction?: { label: string; onSelect: () => void };
  }

  let { jobs, projectName, onAll, emptyAction }: Props = $props();
</script>

<Card class="gap-4">
  <CardHeader class="flex flex-row items-center justify-between gap-3">
    <CardTitle><h2>{t(messages.recentJobs)}</h2></CardTitle>
    {#if jobs?.length}
      <Button variant="ghost" size="sm" onclick={onAll}>
        {t(messages.allJobs)}
        <ArrowRightIcon class="size-4" aria-hidden="true" />
      </Button>
    {/if}
  </CardHeader>
  <CardContent>
    {#if jobs === undefined}
      <ListSkeleton rows={3} rowClass="h-9 w-full" />
    {:else if jobs.length === 0}
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-muted-foreground">{t(messages.noJob)}</p>
        {#if emptyAction}
          <Button variant="outline" size="sm" onclick={emptyAction.onSelect}>
            {emptyAction.label}
          </Button>
        {/if}
      </div>
    {:else}
      <ul class="flex flex-col gap-1">
        {#each jobs as job (job.id)}
          <AgentJobRow {job} projectName={projectName(job.projectId)} />
        {/each}
      </ul>
    {/if}
  </CardContent>
</Card>
