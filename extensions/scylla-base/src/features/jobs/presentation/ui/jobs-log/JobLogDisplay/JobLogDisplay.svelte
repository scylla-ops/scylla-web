<script lang="ts">
  import { Skeleton } from '@scylla/ui/primitives';
  import { EditorState } from '@codemirror/state';
  import { EditorView, lineNumbers } from '@codemirror/view';
  import { renderCodeMirror } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { createTailJobLogs } from './tail-job-logs.state.svelte.ts';
  import { createStreamedLogView } from './streamed-log-view.state.svelte.ts';
  import { jobsMessages } from '@base/features/jobs/presentation/messages/jobs.messages.ts';

  const DEFAULT_MAX_HEIGHT = 448;

  interface Props {
    jobId: string;
    nodeId?: string;
    maxHeight?: number;
  }

  let { jobId, nodeId, maxHeight }: Props = $props();

  const tail = createTailJobLogs({ jobId: () => jobId, nodeId: () => nodeId });
  const stream = createStreamedLogView(() => tail.text);

  /**
   * Only line numbers and read-only. No `drawSelection`: a drag leaves a native
   * selection, which `createStreamedLogView` reads.
   */
  const extensions = $derived([
    lineNumbers(),
    EditorState.readOnly.of(true),
    EditorView.editable.of(false),
    EditorView.theme({ '&': { maxHeight: `${maxHeight ?? DEFAULT_MAX_HEIGHT}px` } }),
  ]);
</script>

<!-- Grows with the log up to `maxHeight`, then scrolls: only the caller knows the room left. -->
{#if tail.isLoading}
  <!-- A few lines of the log. -->
  <div class="flex flex-col gap-1.5 p-3" role="status" aria-busy="true">
    {#each ['w-3/4', 'w-1/2', 'w-2/3', 'w-1/3'] as width (width)}
      <Skeleton class="h-4 {width}" />
    {/each}
  </div>
{:else if tail.isError}
  <div>{t(jobsMessages.logsError)}</div>
{:else if tail.isEnded && !tail.text}
  <p class="px-3 py-2.5 text-sm text-muted-foreground">{t(jobsMessages.noLogs)}</p>
{:else}
  <div class="min-w-0 w-full overflow-hidden">
    <div {@attach renderCodeMirror(() => ({ extensions, onView: stream.attach }))}></div>
    {#if tail.error}
      <p role="status" class="px-3 py-1 text-xs text-destructive">
        {t(jobsMessages.liveTailStopped)}
      </p>
    {/if}
  </div>
{/if}
