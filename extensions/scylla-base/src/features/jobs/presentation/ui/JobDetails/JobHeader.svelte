<script lang="ts">
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import InfoIcon from '@lucide/svelte/icons/info';
  import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
  import { Badge, Button } from '@scylla/ui/primitives';
  import { CopyableText } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { JobEntity } from '@base/features/jobs/domain/entities/job.entity.ts';
  import JobStatus from '../jobs-table/JobStatus/JobStatus.svelte';
  import { jobsMessages } from '@base/features/jobs/presentation/messages/jobs.messages.ts';
  import JobDetailsPanel from './JobDetailsPanel.svelte';
  import JobFacts from './JobFacts.svelte';

  interface Props {
    job: JobEntity;
    onRerun?: () => void;
    isRerunning?: boolean;
  }

  let { job, onRerun, isRerunning = false }: Props = $props();

  const panelId = $props.id();
  let detailsOpen = $state(false);
</script>

<!-- The job in one block: who it is, its status, its facts on one line, and its details on demand. -->
<header class="flex shrink-0 flex-col gap-2">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div class="flex min-w-0 items-center gap-3">
      <h1 class="text-foreground">{t(jobsMessages.job)}</h1>
      <Badge variant="outline" class="gap-1 pr-1 font-mono text-xs">
        <CopyableText value={job.id} copyLabel={t(jobsMessages.copyJobId)} />
      </Badge>
      <div class="min-w-0">
        <JobStatus {job} />
      </div>
    </div>
    <div class="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        aria-expanded={detailsOpen}
        aria-controls={panelId}
        onclick={() => (detailsOpen = !detailsOpen)}
      >
        <InfoIcon aria-hidden="true" />
        {t(jobsMessages.details)}
        <ChevronDownIcon
          aria-hidden="true"
          class={cn('transition-transform duration-200', detailsOpen && 'rotate-180')}
        />
      </Button>
      {#if onRerun}
        <Button variant="outline" size="sm" onclick={onRerun} disabled={isRerunning}>
          <RotateCcwIcon aria-hidden="true" />
          {t(jobsMessages.rerun)}
        </Button>
      {/if}
    </div>
  </div>

  <JobFacts {job} />

  {#if detailsOpen}
    <JobDetailsPanel id={panelId} {job} />
  {/if}
</header>
