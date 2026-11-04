<script lang="ts">
  import { Badge } from '@scylla/ui/primitives';
  import { TruncatedText } from '@scylla/ui';
  import { getStatusIcon } from '@shared/presentation/ui';
  import { cn } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import { getStatusConfig } from '@shared/utils/status-config.ts';
  import type { JobEntity } from '@base/features/jobs/domain/entities/job.entity.ts';
  import { jobsMessages } from '@base/features/jobs/presentation/messages/jobs.messages.ts';

  interface Props {
    job: JobEntity;
  }

  let { job }: Props = $props();

  const config = $derived(getStatusConfig(job.status));
  const Icon = $derived(getStatusIcon(job.status));
</script>

<div class="w-full flex items-center gap-2">
  <Icon class={cn('w-5 h-5 shrink-0', config.iconClassName)} />
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
