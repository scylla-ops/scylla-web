<script lang="ts">
  import { createNow } from '@scylla/ui/state';
  import { t } from '@scylla/ui/i18n';
  import { AgentLabels, IdentityAvatar } from '@shared/presentation/ui';
  import { calculateExecutionDuration, formatDuration } from '@shared/utils/date-utils.ts';
  import { isActiveStatus } from '@shared/domain/structs/job-status.struct.ts';
  import type { JobEntity } from '@base/features/jobs/domain/entities/job.entity.ts';
  import { jobsMessages } from '@base/features/jobs/presentation/messages/jobs.messages.ts';
  import { statusConfigOf } from '@base/features/jobs/presentation/presenters/job-status.presenter.ts';
  import {
    runTimes,
    type RunTime,
  } from '@base/features/jobs/presentation/presenters/job-run-times.presenter.ts';
  import { createJobAgent } from './job-agent.state.svelte.ts';
  import JobDetailsFact from './JobDetailsFact.svelte';
  import JobDetailsGroup from './JobDetailsGroup.svelte';

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
  const times = $derived(runTimes(job));

  const TIME_LABELS = {
    created: jobsMessages.createdTime,
    started: jobsMessages.startedTime,
    finished: jobsMessages.finishedTime,
  } satisfies Record<RunTime['kind'], unknown>;
</script>

<!-- The run of the job: its status, its times, its agent and the labels that it asks. A fact with no value is not shown. -->
<JobDetailsGroup title={t(jobsMessages.runGroup)}>
  <JobDetailsFact label={t(jobsMessages.status)}>
    <span class="truncate">{t(statusConfigOf(job).label)}</span>
  </JobDetailsFact>
  {#if duration !== null}
    <JobDetailsFact label={t(jobsMessages.duration)}>
      <span class="font-mono">{formatDuration(duration)}</span>
    </JobDetailsFact>
  {/if}
  {#each times as time (time.kind)}
    <JobDetailsFact label={t(TIME_LABELS[time.kind])}>
      <span class="truncate tabular-nums" title={time.full}>{time.text}</span>
    </JobDetailsFact>
  {/each}
  {#if job.agentId}
    <JobDetailsFact label={t(jobsMessages.agent)}>
      <IdentityAvatar profile={agent.profile} kind="agent" size={16} />
      {#if agent.href}
        <a class="truncate font-mono underline-offset-4 hover:underline" href={agent.href}>
          {agent.name}
        </a>
      {:else}
        <span class="truncate font-mono">{agent.name}</span>
      {/if}
    </JobDetailsFact>
  {/if}
  {#if job.agentLabels?.length}
    <JobDetailsFact label={t(jobsMessages.agentLabels)}>
      <AgentLabels labels={job.agentLabels} label={t(jobsMessages.agentLabels)} />
    </JobDetailsFact>
  {/if}
</JobDetailsGroup>
