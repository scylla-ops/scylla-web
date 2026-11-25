<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { jobsMessages } from '@base/features/jobs/presentation/messages/jobs.messages.ts';
  import { jobLogMessages } from '@base/features/jobs/presentation/messages/job-log.messages.ts';
  import type { TailedLogs } from '../tail-job-logs.state.svelte.ts';

  interface Props {
    lineCount: number;
    isLive: boolean;
    tail: TailedLogs;
  }

  let { lineCount, isLive, tail }: Props = $props();
</script>

<!-- The size of the log, and whether new lines still come. -->
<div
  class="flex h-7 shrink-0 items-center justify-between gap-3 border-t border-border bg-card px-3 text-xs text-muted-foreground"
>
  <span class="tabular-nums">{t(jobLogMessages.lineCount(lineCount))}</span>
  {#if tail.error && !tail.isError}
    <span role="status" class="truncate text-destructive">{t(jobsMessages.liveTailStopped)}</span>
  {:else if isLive && !tail.isEnded}
    <span class="flex items-center gap-1.5">
      <span class="size-2 shrink-0 animate-pulse rounded-full bg-success" aria-hidden="true"></span>
      {t(jobsMessages.streamingLive)}
    </span>
  {:else}
    <span>{t(jobLogMessages.ended)}</span>
  {/if}
</div>
