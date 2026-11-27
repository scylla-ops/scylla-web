<script lang="ts">
  import FileCodeIcon from '@lucide/svelte/icons/file-code';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import WorkflowIcon from '@lucide/svelte/icons/workflow';
  import type { PipelineHistory } from '@base/features/jobs';
  import { CopyableText, StatusShape } from '@scylla/ui';
  import {
    Badge,
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
  } from '@scylla/ui/primitives';
  import { createNow } from '@scylla/ui/state';
  import { t } from '@scylla/ui/i18n';
  import { formatCoarseDuration, formatDuration, getRelativeTime } from '@shared/utils/date-utils.ts';
  import { toStatusState } from '@shared/utils/job-status.utils.ts';
  import { getStatusConfig } from '@shared/utils/status-config.ts';
  import type {
    PipelineMetadata,
    PipelineSource,
  } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
  import { fileMessages } from '@base/features/pipeline/presentation/messages/file.messages.ts';
  import { pipelineMessages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';
  import { liveFooterMessage } from '@base/features/pipeline/presentation/presenters/project-card.presenter.ts';
  import type { RowNote } from '@base/features/pipeline/presentation/presenters/pipeline-file.presenter.ts';
  import {
    jobDuration,
    shortId,
  } from '@base/features/pipeline/presentation/presenters/pipeline-history.presenter.ts';
  import PipelineStatsCard from './PipelineStatsCard.svelte';

  interface Props {
    pipeline: PipelineMetadata;
    /** Not loaded yet, or not allowed. */
    history?: PipelineHistory;
    /** The jobs of the bars of the row: the stats card counts the same jobs. */
    count: number;
    /** The state of the file of a file pipeline, or why the pipeline is read only. */
    note?: RowNote | null;
    /** The source badge, in a list with the two sources. `null`: no badge. */
    source?: PipelineSource | null;
    /** Makes the name a link. A click on it opens the pipeline and does not select the row. */
    onOpen?: () => void;
  }

  let { pipeline, history, count, note, source = null, onOpen }: Props = $props();

  const SourceIcon = $derived(source === 'file' ? FileCodeIcon : WorkflowIcon);

  const lastJob = $derived(history?.jobs[0]);
  const isRunning = $derived(lastJob?.status === 'running');
  // A job that waits for an agent or for an approval: the line under the name says so.
  const isWaiting = $derived(lastJob?.status === 'pending' || lastJob?.status === 'awaiting_approval');
  // The clock of a running job moves each second, and stops when it finishes. A waiting job counts
  // its time too.
  const now = createNow(() => isRunning || isWaiting);
  const statusLabel = $derived(
    lastJob ? t(getStatusConfig(lastJob.status).label) : t(pipelineMessages.noRunYet),
  );
</script>

<div class="flex w-full items-center gap-3">
  <Tooltip>
    <TooltipTrigger>
      {#snippet child({ props })}
        <span {...props} class="flex size-16 shrink-0 items-center justify-center">
          <StatusShape state={toStatusState(lastJob?.status)} label={statusLabel} size={64} />
        </span>
      {/snippet}
    </TooltipTrigger>
    <TooltipContent><p>{statusLabel}</p></TooltipContent>
  </Tooltip>

  <HoverCard openDelay={300} closeDelay={150}>
    <HoverCardTrigger>
      {#snippet child({ props })}
        <div {...props} class="flex w-52 min-w-0 flex-col items-start gap-0.5 text-left">
          <div class="flex h-5 max-w-full min-w-0 items-center gap-1.5">
            {#if onOpen}
              <button
                type="button"
                class="min-w-0 cursor-pointer truncate text-left font-semibold text-foreground hover:underline"
                onclick={event => {
                  event.stopPropagation();
                  onOpen();
                }}
              >
                {pipeline.name}
              </button>
            {:else}
              <span class="min-w-0 truncate font-semibold text-foreground">{pipeline.name}</span>
            {/if}
            {#if source}
              <!-- A phone shows the icon only; the name stays for a screen reader. -->
              <Badge variant="outline" class="h-4.5 text-muted-foreground" data-source={source}>
                <SourceIcon aria-hidden="true" />
                <span class="[text-box:trim-both_cap_alphabetic] max-sm:sr-only">
                  {t(source === 'file' ? fileMessages.fromFile : fileMessages.scylla)}
                </span>
              </Badge>
            {/if}
            {#if note}
              <Tooltip>
                <TooltipTrigger>
                  {#snippet child({ props: noteProps })}
                    <Badge
                      {...noteProps}
                      tabindex={0}
                      variant={note.tone === 'error' ? 'destructive' : 'warning'}
                      class="h-4.5"
                    >
                      {#if note.tone === 'warning'}<TriangleAlertIcon aria-hidden="true" />{/if}
                      <span class="[text-box:trim-both_cap_alphabetic]">{note.badge}</span>
                    </Badge>
                  {/snippet}
                </TooltipTrigger>
                <TooltipContent><p>{note.text}</p></TooltipContent>
              </Tooltip>
            {/if}
          </div>
          {#if lastJob && isRunning}
            <span class="max-w-full truncate text-xs text-muted-foreground">
              {statusLabel} ·
              <span class="text-foreground">{formatDuration(jobDuration(lastJob, now.value) ?? 0)}</span>
            </span>
          {:else if lastJob && isWaiting}
            <span class="max-w-full truncate text-xs text-muted-foreground" data-part="pipeline-waiting">
              {t(
                liveFooterMessage(lastJob.status)(
                  formatCoarseDuration((now.value - Date.parse(lastJob.startedAt ?? lastJob.createdAt)) / 1000),
                ),
              )}
            </span>
          {:else if lastJob}
            <span class="max-w-full truncate text-xs text-muted-foreground">
              {t(pipelineMessages.lastRunAt(getRelativeTime(lastJob.updatedAt)))}
            </span>
          {/if}
          <CopyableText
            value={pipeline.id}
            display={shortId(pipeline.id)}
            copyButtonClass="size-6"
            class="max-w-full text-xs text-muted-foreground opacity-80"
          />
        </div>
      {/snippet}
    </HoverCardTrigger>
    <HoverCardContent side="bottom" class="w-80 p-3 shadow-lg">
      <PipelineStatsCard {pipeline} {history} {count} />
    </HoverCardContent>
  </HoverCard>
</div>
