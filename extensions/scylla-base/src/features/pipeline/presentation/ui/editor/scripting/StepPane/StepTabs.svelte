<script lang="ts">
  import type { Snippet } from 'svelte';
  import ColumnsIcon from '@lucide/svelte/icons/columns-2';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import XIcon from '@lucide/svelte/icons/x';
  import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { PipelineStep } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
  import { stepPreview } from '@base/features/pipeline/presentation/ui/editor/step/step-summary.ts';
  import { copyToClipboard } from '../copy-to-clipboard.ts';
  import type { StepPane } from '../step-panes.svelte.ts';
  import type { PipelineScriptingState } from '../pipeline-scripting.state.svelte.ts';
  import { scriptingMessages } from '../scripting.messages.ts';

  interface Props {
    scripting: PipelineScriptingState;
    pane: StepPane;
    index: number;
    /** The step the pane shows. */
    step?: PipelineStep;
    /** At the start and at the end of the bar: where the view puts the toggles of its side panels. */
    leading?: Snippet;
    trailing?: Snippet;
  }

  let { scripting, pane, index, step, leading, trailing }: Props = $props();

  // A script is copied as it runs; a command as one line.
  const copyStep = (step: PipelineStep) =>
    copyToClipboard(step.kind === 'script' ? step.script : stepPreview(step));
</script>

<div class="flex h-10 shrink-0 items-stretch border-b bg-muted/40">
  {#if leading}
    <div class="flex shrink-0 items-center border-r px-1.5">{@render leading()}</div>
  {/if}
  <div
    role="group"
    aria-label={t(scriptingMessages.openSteps)}
    class="relative flex min-w-0 flex-1 items-stretch overflow-x-auto"
  >
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
          aria-current={active ? 'true' : undefined}
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
      <Tooltip>
        <TooltipTrigger>
          {#snippet child({ props })}
            <Button
              {...props}
              variant="ghost"
              size="icon-sm"
              aria-label={t(scriptingMessages.copyStep)}
              onclick={() => copyStep(step)}
            >
              <CopyIcon class="size-4" />
            </Button>
          {/snippet}
        </TooltipTrigger>
        <TooltipContent>{t(scriptingMessages.copyStep)}</TooltipContent>
      </Tooltip>
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
    {@render trailing?.()}
  </div>
</div>
