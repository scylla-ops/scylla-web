<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import type { NodeDraft } from '@base/features/pipeline/presentation/ui/editor/node/node-draft.state.svelte.ts';
  import { nodePreview } from '@base/features/pipeline/presentation/presenters/node-summary.presenter.ts';
  import { scriptingMessages } from '@base/features/pipeline/presentation/messages/scripting.messages.ts';
  import NodeCommandFields from '@base/features/pipeline/presentation/ui/editor/node/NodeCommandFields.svelte';
  import NodeScriptField from '@base/features/pipeline/presentation/ui/editor/node/NodeScriptField.svelte';
  import NodeSwitchFields from '@base/features/pipeline/presentation/ui/editor/node/NodeSwitchFields/NodeSwitchFields.svelte';
  import { nodeMessages } from '@base/features/pipeline/presentation/messages/node.messages.ts';

  interface Props {
    draft: NodeDraft;
    /** The nodes whose outputs a switch can read. */
    outputNodes: string[];
  }

  let { draft, outputNodes }: Props = $props();
</script>

<!--
  A script is edited as shell code; a command, which runs with no shell, as a form; a switch as the
  form of its cases. A merge has nothing to edit but its needs, in the properties.
-->
{#if draft.mode === 'switch'}
  <div class="relative flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
    <div class="max-w-2xl">
      <NodeSwitchFields {draft} {outputNodes} />
    </div>
  </div>
{:else if draft.mode === 'merge'}
  <p class="m-auto max-w-sm text-center text-sm text-muted-foreground">{t(nodeMessages.mergeHint)}</p>
{:else if draft.mode === 'script'}
  <NodeScriptField {draft} flush class="min-h-0" />
{:else}
  <div class="relative flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
    <div class="flex max-w-2xl flex-col gap-4">
      <NodeCommandFields {draft} />
      <div class="flex flex-col gap-2">
        <span class="text-sm font-medium">{t(scriptingMessages.commandPreview)}</span>
        <code class="rounded-md border bg-muted/40 px-3 py-2 font-mono text-[13px] break-all">
          {nodePreview(draft.value)}
        </code>
      </div>
    </div>
  </div>
{/if}
