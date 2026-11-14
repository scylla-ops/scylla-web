<script lang="ts">
  import { Badge } from '@scylla/ui/primitives';
  import { StatusShape, TruncatedText } from '@scylla/ui';
  import { cn } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import { toStatusState } from '@shared/utils/job-status.utils.ts';
  import type { JobEntity } from '@base/features/jobs/domain/entities/job.entity.ts';
  import {
    statusConfigOf,
    statusHintOf,
  } from '@base/features/jobs/presentation/presenters/job-status.presenter.ts';

  interface Props {
    job: JobEntity;
  }

  let { job }: Props = $props();

  const config = $derived(statusConfigOf(job));
  const hint = $derived(statusHintOf(job));
</script>

<div class="w-full flex items-center gap-2">
  <StatusShape state={toStatusState(job.status)} label={t(config.label)} size={32} />
  <div class="flex min-w-0 flex-col">
    <Badge variant="outline" class={cn('w-fit', config.badgeClassName)}>
      {t(config.label)}
    </Badge>
    {#if hint}
      <TruncatedText class="text-xs text-muted-foreground">
        {t(hint)}
      </TruncatedText>
    {/if}
  </div>
</div>
