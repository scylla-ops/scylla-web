<script lang="ts">
  import { fold, unfold } from '@scylla/ui';
  import type { JobEntity } from '@base/features/jobs/domain/entities/job.entity.ts';
  import JobReportsBand from './JobReportsBand.svelte';
  import JobRunFacts from './JobRunFacts.svelte';
  import JobSourceFacts from './JobSourceFacts.svelte';

  interface Props {
    id: string;
    job: JobEntity;
  }

  let { id, job }: Props = $props();
</script>

<!-- The details of the job, one row for each group: the run, its commit, its reports to the provider. -->
<div
  {id}
  class="flex flex-col gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5"
  in:unfold
  out:fold
>
  <JobRunFacts {job} />
  {#if job.source}
    <JobSourceFacts {job} source={job.source} />
    <JobReportsBand {job} />
  {/if}
</div>
