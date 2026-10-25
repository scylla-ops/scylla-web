<script lang="ts">
  import type { Snippet } from 'svelte';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { StepPane } from '../step-panes.state.svelte.ts';
  import type { PipelineScriptingState } from '../pipeline-scripting.state.svelte.ts';
  import { scriptingMessages } from '@base/features/pipeline/presentation/messages/scripting.messages.ts';
  import StepEditor from './StepEditor.svelte';
  import StepTabs from './StepTabs.svelte';

  interface Props {
    scripting: PipelineScriptingState;
    pane: StepPane;
    index: number;
    /** The toggles that StepTabs shows at the ends of its bar. */
    leading?: Snippet;
    trailing?: Snippet;
  }

  let { scripting, pane, index, leading, trailing }: Props = $props();

  const step = $derived(scripting.stepOf(pane.active));
  /** With two panes, the focused one is marked: the properties panel shows its step. */
  const marksFocus = $derived(scripting.panes.panes.length > 1 && scripting.panes.focused === index);
</script>

<!-- A pane takes the focus of what is inside it: the properties panel follows that pane. -->
<section
  aria-label={pane.active ?? t(scriptingMessages.noStepOpen)}
  class={cn(
    'flex h-full min-w-0 flex-col',
    marksFocus && 'shadow-[inset_0_2px_0_var(--primary)]',
  )}
  onfocusin={() => scripting.panes.focus(index)}
>
  <StepTabs {scripting} {pane} {index} {step} {leading} {trailing} />

  {#if step}
    <!-- One editor per step: switching tabs does not mix the undo history of two steps. -->
    {#key step.id}
      <StepEditor draft={scripting.draftOf(step)} />
    {/key}
  {:else}
    <p class="m-auto text-sm text-muted-foreground">{t(scriptingMessages.noStepOpen)}</p>
  {/if}
</section>
