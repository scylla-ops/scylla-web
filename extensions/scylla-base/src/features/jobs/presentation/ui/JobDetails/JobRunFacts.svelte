<script lang="ts">
  import { createNow } from '@scylla/ui/state';
  import { t } from '@scylla/ui/i18n';
  import { AgentLabels } from '@shared/presentation/ui';
  import {
    calculateExecutionDuration,
    formatDate,
    formatDuration,
  } from '@shared/utils/date-utils.ts';
  import { isActiveStatus } from '@shared/domain/structs/job-status.struct.ts';
  import type { JobEntity } from '@base/features/jobs/domain/entities/job.entity.ts';
  import { jobsMessages } from '@base/features/jobs/presentation/messages/jobs.messages.ts';
  import { statusConfigOf } from '@base/features/jobs/presentation/presenters/job-status.presenter.ts';
  import { createJobAgent } from './job-agent.state.svelte.ts';

  interface Props {
    job: JobEntity;
  }

  let { job }: Props = $props();

  const now = createNow(() => isActiveStatus(job.status));
  const agent = createJobAgent(() => job.agentId);
  const duration = $derived.by(() => {
    void now.value;
    return calculateExecutionDuration(job.startedAt, job.finishedAt);
  });
</script>

{#snippet row(label: string, value: string)}
  <div class="flex min-w-0 items-center gap-3">
    <dt class="w-24 shrink-0 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
      {label}
    </dt>
    <dd class="min-w-0 truncate font-mono text-xs text-foreground">{value}</dd>
  </div>
{/snippet}

<!-- The run of the job: its status, its times, its agent and the labels that it asks. -->
<dl class="flex flex-col gap-1.5">
  {@render row(t(jobsMessages.status), t(statusConfigOf(job).label))}
  {@render row(t(jobsMessages.duration), duration === null ? '-' : formatDuration(duration))}
  {@render row(t(jobsMessages.startedPrefix), job.startedAt ? formatDate(job.startedAt) : '-')}
  {@render row(t(jobsMessages.finishedPrefix), job.finishedAt ? formatDate(job.finishedAt) : '-')}
  {@render row(t(jobsMessages.createdPrefix), formatDate(job.createdAt))}
  {#if job.agentId}
    <div class="flex min-w-0 items-center gap-3">
      <dt class="w-24 shrink-0 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {t(jobsMessages.agent)}
      </dt>
      <dd class="min-w-0 truncate font-mono text-xs text-foreground">
        {#if agent.href}
          <a class="hover:underline" href={agent.href}>{agent.name}</a>
        {:else}
          {agent.name}
        {/if}
      </dd>
    </div>
  {/if}
  {#if job.agentLabels?.length}
    <div class="flex min-w-0 items-center gap-3">
      <dt class="w-24 shrink-0 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {t(jobsMessages.agentLabels)}
      </dt>
      <dd class="min-w-0">
        <AgentLabels labels={job.agentLabels} label={t(jobsMessages.agentLabels)} />
      </dd>
    </div>
  {/if}
</dl>
