<script lang="ts">
  import { Badge } from '@scylla/ui/primitives';
  import { StatusShape, TruncatedText } from '@scylla/ui';
  import { cn } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import { toStatusState } from '@shared/utils/job-status.utils.ts';
  import { getStatusConfig } from '@shared/utils/status-config.ts';
  import type { JobEntity } from '@base/features/jobs/domain/entities/job.entity.ts';
  import { jobsMessages } from '@base/features/jobs/presentation/messages/jobs.messages.ts';

  interface Props {
    job: JobEntity;
  }

  let { job }: Props = $props();

  const config = $derived(getStatusConfig(job.status));
</script>

<div class="w-full flex items-center gap-2">
  <StatusShape state={toStatusState(job.status)} label={t(config.label)} size={32} />
  <div class="flex min-w-0 flex-col">
    <Badge variant="outline" class={cn('w-fit', config.badgeClassName)}>
      {t(config.label)}
    </Badge>
    {#if job.status === 'pending'}
      <TruncatedText class="text-xs text-muted-foreground">
        {t(jobsMessages.queuedHint)}
      </TruncatedText>
    {:else if job.status === 'orphaned'}
      <TruncatedText class="text-xs text-muted-foreground">
        {t(jobsMessages.orphanedHint)}
      </TruncatedText>
    {/if}
  </div>
</div>
