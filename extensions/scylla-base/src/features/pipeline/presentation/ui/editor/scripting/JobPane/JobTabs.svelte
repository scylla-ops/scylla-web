<script lang="ts">
  import ColumnsIcon from '@lucide/svelte/icons/columns-2';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import XIcon from '@lucide/svelte/icons/x';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { PipelineStep } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
  import { stepPreview } from '@base/features/pipeline/presentation/utils/step-summary.ts';
  import { copyToClipboard } from '../copy-to-clipboard.ts';
  import type { JobPane } from '../job-panes.svelte.ts';
  import type { ScriptingState } from '../scripting.state.svelte.ts';
  import { scriptingMessages } from '../scripting.messages.ts';

  interface Props {
    scripting: ScriptingState;
    pane: JobPane;
    index: number;
    /** The job the pane shows. */
    step?: PipelineStep;
  }

  let { scripting, pane, index, step }: Props = $props();

  // A script is copied as it runs; a command as one line.
  const copyJob = (job: PipelineStep) =>
    copyToClipboard(job.kind === 'script' ? job.script : stepPreview(job));
</script>

<div class="flex h-10 shrink-0 items-stretch border-b bg-muted/40">
  <div role="tablist" class="relative flex min-w-0 flex-1 items-stretch overflow-x-auto">
    {#each pane.tabs as tab (tab)}
      {@const active = tab === pane.active}
      <div
        class={cn(
          'flex shrink-0 items-center gap-1 border-r pr-1 font-mono text-[13px]',
          active ? 'bg-card text-foreground shadow-[inset_0_2px_0_var(--primary)]' : 'text-muted-foreground',
        )}
      >
        <button
          type="button"
          role="tab"
          aria-selected={active}
          class="h-full pl-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onclick={() => scripting.panes.open(tab, index)}
        >
          {tab}
        </button>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={t(scriptingMessages.closeTab(tab))}
          onclick={() => scripting.panes.close(tab, index)}
        >
          <XIcon class="size-3" />
        </Button>
      </div>
    {/each}
  </div>

  <div class="flex shrink-0 items-center gap-0.5 px-1.5">
    {#if step}
      <Button variant="ghost" size="sm" onclick={() => copyJob(step)}>
        <CopyIcon class="size-3.5" />
        {t(scriptingMessages.copyJob)}
      </Button>
    {/if}
    {#if scripting.panes.canSplit}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t(scriptingMessages.splitEditor)}
        disabled={!step}
        onclick={() => scripting.panes.split()}
      >
        <ColumnsIcon class="size-4" />
      </Button>
    {:else}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t(scriptingMessages.closePane)}
        onclick={() => scripting.panes.closePane(index)}
      >
        <XIcon class="size-4" />
      </Button>
    {/if}
  </div>
</div>
