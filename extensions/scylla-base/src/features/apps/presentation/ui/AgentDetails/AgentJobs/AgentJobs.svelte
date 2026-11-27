<script lang="ts">
  import ListChecksIcon from '@lucide/svelte/icons/list-checks';
  import SearchIcon from '@lucide/svelte/icons/search';
  import { createQuery } from '@scylla/core-sdk';
  import { ListSkeleton, SegmentedControl, StableLabel } from '@scylla/ui';
  import { Button, Card, CardContent, Input } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { projectQueries } from '@base/features/project';
  import type { AgentStats } from '@base/features/apps/domain/structs/agent-stats.struct.ts';
  import { jobFilterChoices } from '@base/features/apps/presentation/presenters/agent-jobs.presenter.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import AgentJobRow from '../AgentJobRow.svelte';
  import { createAgentJobs, JOBS_STEP } from './agent-jobs.state.svelte.ts';

  interface Props {
    workspaceId: string;
    appId: string;
    /** The days since the agent joined, for the counts of the filter. */
    stats: AgentStats | undefined;
    /** The jobs that run now. */
    running: number;
    /** The next step of an agent with no job. */
    emptyAction?: { label: string; onSelect: () => void };
  }

  let { workspaceId, appId, stats, running, emptyAction }: Props = $props();

  const jobs = createAgentJobs(() => ({ workspaceId, appId, enabled: true }));
  const projects = createQuery(() => projectQueries.lookup(workspaceId));
  const projectName = (id: string) =>
    projects.data?.items.find(project => project.id === id)?.name ?? '';
  const choices = $derived(jobFilterChoices(stats?.outcomes, running));
</script>

<!-- The filter and the search on one line, the list under them, "Show 10 more" at its end. -->
<Card class="gap-4">
  <CardContent class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <SegmentedControl
        size="sm"
        value={jobs.filter}
        options={choices}
        onChange={jobs.setFilter}
        aria-label={t(messages.jobFilter)}
        class="max-w-full flex-wrap max-sm:w-full max-sm:justify-center max-sm:rounded-2xl"
      />
      <div class="relative w-full sm:w-64">
        <SearchIcon
          class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          class="h-8 pl-9"
          placeholder={t(messages.searchHint)}
          aria-label={t(messages.searchJobs)}
          value={jobs.text}
          oninput={event => jobs.setText(event.currentTarget.value)}
        />
      </div>
    </div>

    {#if jobs.jobs === undefined}
      <ListSkeleton rows={4} rowClass="h-9 w-full" />
    {:else if jobs.jobs.length === 0}
      <div class="flex min-h-36 flex-col items-center justify-center gap-3 text-center">
        <span
          class="flex size-10 items-center justify-center rounded-full bg-muted text-primary"
          aria-hidden="true"
        >
          <ListChecksIcon class="size-5" />
        </span>
        <p class="text-sm text-muted-foreground">
          {t(jobs.filtered ? messages.noJobMatch : messages.noJob)}
        </p>
        {#if jobs.filtered}
          <Button variant="outline" size="sm" onclick={jobs.clear}>
            {t(messages.clearFilters)}
          </Button>
        {:else if emptyAction}
          <Button variant="outline" size="sm" onclick={emptyAction.onSelect}>
            {emptyAction.label}
          </Button>
        {/if}
      </div>
    {:else}
      <ul class={cn('flex flex-col gap-1 transition-opacity', jobs.loading && 'opacity-60')}>
        {#each jobs.jobs as job (job.id)}
          <AgentJobRow {job} projectName={projectName(job.projectId)} withDuration />
        {/each}
      </ul>
      {#if jobs.more}
        <div class="flex justify-center">
          <Button variant="outline" size="sm" onclick={jobs.showMore} disabled={jobs.loading}>
            <StableLabel
              text={t(messages.showMore(JOBS_STEP))}
              reserve={[]}
              busy={jobs.loading}
            />
          </Button>
        </div>
      {/if}
    {/if}
  </CardContent>
</Card>
