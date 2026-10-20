<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { JobPane } from '../job-panes.svelte.ts';
  import type { PipelineScriptingState } from '../pipeline-scripting.state.svelte.ts';
  import { scriptingMessages } from '../scripting.messages.ts';
  import JobEditor from './JobEditor.svelte';
  import JobTabs from './JobTabs.svelte';

  interface Props {
    scripting: PipelineScriptingState;
    pane: JobPane;
    index: number;
  }

  let { scripting, pane, index }: Props = $props();

  const step = $derived(scripting.stepOf(pane.active));
  /** With two panes, the focused one is marked: the properties panel shows its job. */
  const marksFocus = $derived(scripting.panes.panes.length > 1 && scripting.panes.focused === index);
</script>

<!-- A pane takes the focus of what is inside it: the properties panel follows that pane. -->
<section
  aria-label={pane.active ?? t(scriptingMessages.noJobOpen)}
  class={cn(
    'flex min-w-0 flex-1 flex-col border-l first:border-l-0',
    marksFocus && 'shadow-[inset_0_2px_0_var(--primary)]',
  )}
  onfocusin={() => scripting.panes.focus(index)}
>
  <JobTabs {scripting} {pane} {index} {step} />

  {#if step}
    <!-- One editor per job: switching tabs does not mix the undo history of two jobs. -->
    {#key step.id}
      <JobEditor draft={scripting.draftOf(step)} />
    {/key}
  {:else}
    <p class="m-auto text-sm text-muted-foreground">{t(scriptingMessages.noJobOpen)}</p>
  {/if}
</section>
