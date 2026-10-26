<script lang="ts">
  import type { Snippet } from 'svelte';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { NodePane } from '../node-panes.state.svelte.ts';
  import type { PipelineScripting } from '../pipeline-scripting.state.svelte.ts';
  import { scriptingMessages } from '@base/features/pipeline/presentation/messages/scripting.messages.ts';
  import NodeEditor from './NodeEditor.svelte';
  import NodeTabs from './NodeTabs.svelte';

  interface Props {
    scripting: PipelineScripting;
    pane: NodePane;
    index: number;
    /** The toggles that NodeTabs shows at the ends of its bar. */
    leading?: Snippet;
    trailing?: Snippet;
  }

  let { scripting, pane, index, leading, trailing }: Props = $props();

  const node = $derived(scripting.nodeOf(pane.active));
  /** With two panes, the focused one is marked: the properties panel shows its node. */
  const marksFocus = $derived(scripting.panes.panes.length > 1 && scripting.panes.focused === index);
</script>

<!-- A pane takes the focus of what is inside it: the properties panel follows that pane. -->
<section
  aria-label={pane.active ?? t(scriptingMessages.noNodeOpen)}
  class={cn(
    'flex h-full min-w-0 flex-col',
    marksFocus && 'shadow-[inset_0_2px_0_var(--primary)]',
  )}
  onfocusin={() => scripting.panes.focus(index)}
>
  <NodeTabs {scripting} {pane} {index} {node} {leading} {trailing} />

  {#if node}
    <!-- One editor per node: switching tabs does not mix the undo history of two nodes. -->
    {#key node.id}
      <NodeEditor draft={scripting.draftOf(node)} />
    {/key}
  {:else}
    <p class="m-auto text-sm text-muted-foreground">{t(scriptingMessages.noNodeOpen)}</p>
  {/if}
</section>
