<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { JobEntity } from '@base/features/jobs/domain/entities/job.entity.ts';
  import { jobsMessages } from '@base/features/jobs/presentation/messages/jobs.messages.ts';
  import { jobGitMessages } from '@base/features/jobs/presentation/messages/job-git.messages.ts';
  import JobReportsBand from './JobReportsBand.svelte';
  import JobRunFacts from './JobRunFacts.svelte';
  import JobSourceFacts from './JobSourceFacts.svelte';

  interface Props {
    id: string;
    job: JobEntity;
  }

  let { id, job }: Props = $props();
</script>

<!-- The details of the job in three groups: the run, its commit, its reports to the provider. -->
<div
  {id}
  class={cn(
    'grid gap-x-6 gap-y-4 rounded-xl border border-border bg-card p-3.5',
    job.source && 'md:grid-cols-3',
  )}
>
  <div class="flex min-w-0 flex-col gap-2">
    <h3 class="text-sm text-foreground">{t(jobsMessages.runGroup)}</h3>
    <JobRunFacts {job} />
  </div>
  {#if job.source}
    <div class="flex min-w-0 flex-col gap-2">
      <h3 class="text-sm text-foreground">{t(jobGitMessages.source)}</h3>
      <JobSourceFacts {job} source={job.source} />
    </div>
    <div class="flex min-w-0 flex-col gap-2">
      <h3 class="text-sm text-foreground">{t(jobGitMessages.report)}</h3>
      <JobReportsBand {job} />
    </div>
  {/if}
</div>
