<script lang="ts">
  import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
  import type { Snippet } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import { renderCodeMirror } from '@scylla/ui';
  import { Skeleton } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { jobsMessages } from '@base/features/jobs/presentation/messages/jobs.messages.ts';
  import { jobLogMessages } from '@base/features/jobs/presentation/messages/job-log.messages.ts';
  import type { TailedLogs } from '../tail-job-logs.state.svelte.ts';
  import type { LogDisplay } from '../log-display-settings.state.svelte.ts';
  import { createJobLogViewer, downloadLog } from './job-log-viewer.state.svelte.ts';
  import { listenToLogShortcuts } from './log-shortcuts.attachments.ts';
  import LogFooter from './LogFooter.svelte';
  import LogToolbar from './LogToolbar.svelte';

  interface Props {
    /** The stream of the whole job: the viewer shows the lines of `nodeId`. */
    tail: TailedLogs;
    /** `null`: the whole job. */
    nodeId: string | null;
    title: string;
    display: LogDisplay;
    /** The job runs: new lines can come. */
    isLive: boolean;
    fullscreen: boolean;
    onFullscreenChange: (fullscreen: boolean) => void;
    /** The name of a download, with no extension. */
    fileName: string;
    /** A fact of the path above the log: the ports that a switch chose, where a failure went. */
    note?: Snippet;
    /** In place of the log: why the node has none (it did not run). */
    unavailable?: string;
  }

  let {
    tail,
    nodeId,
    title,
    display,
    isLive,
    fullscreen,
    onFullscreenChange,
    fileName,
    note,
    unavailable,
  }: Props = $props();

  const viewer = createJobLogViewer({
    tail: () => tail,
    nodeId: () => nodeId,
    settings: () => display.current,
  });

  let searchInput: HTMLInputElement | null = null;
  const searchField: Attachment<HTMLInputElement> = input => {
    searchInput = input;
    return () => {
      searchInput = null;
    };
  };

  const hasLines = $derived(viewer.lines.length > 0);
</script>

<!--
  The log fills the room that the page gives it, and only the log scrolls. The keys work while the
  focus is not in a field: `/` searches, `E` and `Shift+E` go to the errors, `F` and `Escape` change
  the full screen.
-->
<section
  aria-label={t(jobLogMessages.logOf(title))}
  class="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-(--code-editor-bg) shadow-sm"
  {@attach listenToLogShortcuts(() => ({
    search: () => searchInput?.focus(),
    nextError: viewer.nextError,
    previousError: viewer.previousError,
    toggleFullscreen: () => onFullscreenChange(!fullscreen),
    exitFullscreen: fullscreen ? () => onFullscreenChange(false) : undefined,
  }))}
>
  <LogToolbar
    {viewer}
    {display}
    {title}
    {isLive}
    {searchField}
    {fullscreen}
    onToggleFullscreen={() => onFullscreenChange(!fullscreen)}
    onDownload={raw => downloadLog(viewer.lines, raw, fileName)}
  />
  {@render note?.()}

  <div class="relative min-h-0 flex-1">
    {#if unavailable}
      <p class="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
        {unavailable}
      </p>
    {:else if tail.isLoading}
      <div class="flex flex-col gap-1.5 p-3" role="status" aria-busy="true">
        {#each ['w-3/4', 'w-1/2', 'w-2/3', 'w-1/3'] as width (width)}
          <Skeleton class="h-4 {width}" />
        {/each}
      </div>
    {:else if tail.isError}
      <p class="flex h-full items-center justify-center p-4 text-center text-sm text-destructive">
        {t(jobsMessages.logsError)}
      </p>
    {:else if tail.isEnded && !hasLines}
      <p class="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
        {t(jobsMessages.noLogs)}
      </p>
    {:else}
      <div
        class="absolute inset-0"
        {@attach renderCodeMirror(() => ({
          extensions: viewer.extensions,
          flush: true,
          onView: viewer.attach,
        }))}
      ></div>
      {#if !hasLines}
        <p
          class="pointer-events-none absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-muted-foreground"
        >
          {t(jobLogMessages.waitingForOutput)}
        </p>
      {/if}
      {#if viewer.newLines > 0}
        <button
          type="button"
          onclick={viewer.follow}
          class="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow-md transition-colors hover:bg-primary/90"
        >
          <ArrowDownIcon class="size-3.5 shrink-0" aria-hidden="true" />
          {t(jobLogMessages.newLines(viewer.newLines))}
        </button>
      {/if}
    {/if}
  </div>

  <LogFooter lineCount={viewer.lines.length} {isLive} {tail} />
</section>
