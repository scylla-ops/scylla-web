<script lang="ts">
  import { CopyableText, StatusShape, type StatusState } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { formatDay } from '@shared/utils/date-utils.ts';
  import { cn } from '@scylla/ui/utils';
  import type { PipelineMetadata } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
  import { pipelineMessages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';
  import type { OriginNote } from '@base/features/pipeline/presentation/presenters/pipeline-file.presenter.ts';

  interface Props {
    pipeline: PipelineMetadata;
    /** The state of the last run. */
    status: StatusState;
    /** The state of the last run, in words. */
    statusLabel: string;
    /** The state of the file of a file pipeline, or why the pipeline is read only. */
    note?: OriginNote | null;
  }

  let { pipeline, status, statusLabel, note }: Props = $props();
</script>

<div class="flex w-full flex-row items-center justify-start gap-2">
  <div class="shrink-0">
    <StatusShape state={status} label={statusLabel} size={40} />
  </div>

  <!-- Stretched, not `items-start`, or `truncate` has nothing to cut. -->
  <div class="flex min-w-0 flex-1 flex-col text-start">
    <span class="truncate font-semibold text-foreground">{pipeline.name}</span>
    {#if note}
      <span
        class={cn(
          'truncate text-xs',
          note.tone === 'error' ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {note.text}
      </span>
    {/if}
    <span class="truncate text-xs text-muted-foreground">
      {t(pipelineMessages.creation)}
      {formatDay(pipeline.createdAt)}
    </span>
    <CopyableText class="text-xs text-muted-foreground/80" value={pipeline.id} />
  </div>
</div>
