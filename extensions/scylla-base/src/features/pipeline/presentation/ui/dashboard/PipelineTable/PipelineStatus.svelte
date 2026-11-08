<script lang="ts">
  import { CopyableText, StatusShape, type StatusState } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { formatDay } from '@shared/utils/date-utils.ts';
  import type { PipelineMetadata } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
  import { pipelineMessages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';

  interface Props {
    pipeline: PipelineMetadata;
    /** The state of the last run. */
    status: StatusState;
    /** The state of the last run, in words. */
    statusLabel: string;
  }

  let { pipeline, status, statusLabel }: Props = $props();
</script>

<div class="flex w-full flex-row items-center justify-start gap-2">
  <div class="shrink-0">
    <StatusShape state={status} label={statusLabel} size={40} />
  </div>

  <!-- Stretched, not `items-start`, or `truncate` has nothing to cut. -->
  <div class="flex min-w-0 flex-1 flex-col text-start">
    <span class="truncate font-semibold text-foreground">{pipeline.name}</span>
    <span class="truncate text-xs text-muted-foreground">
      {t(pipelineMessages.creation)}
      {formatDay(pipeline.createdAt)}
    </span>
    <CopyableText class="text-xs text-muted-foreground/80" value={pipeline.id} />
  </div>
</div>
