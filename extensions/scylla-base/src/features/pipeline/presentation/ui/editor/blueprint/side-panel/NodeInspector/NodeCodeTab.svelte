<script lang="ts">
  import type { NodeDraft } from '@base/features/pipeline/presentation/ui/editor/node/node-draft.state.svelte.ts';
  import NodeCommandFields from '@base/features/pipeline/presentation/ui/editor/node/NodeCommandFields.svelte';
  import NodeKindPicker from '@base/features/pipeline/presentation/ui/editor/node/NodeKindPicker.svelte';
  import NodeScriptField from '@base/features/pipeline/presentation/ui/editor/node/NodeScriptField.svelte';
  import NodeTimeoutRetriesFields from '@base/features/pipeline/presentation/ui/editor/node/NodeTimeoutRetriesFields.svelte';
  import NodeWorkingDirField from '@base/features/pipeline/presentation/ui/editor/node/NodeWorkingDirField.svelte';

  interface Props {
    draft: NodeDraft;
  }

  let { draft }: Props = $props();
</script>

<div class="flex min-h-0 flex-1 flex-col gap-3 p-4">
  <NodeKindPicker {draft} />

  {#if draft.mode === 'script'}
    <NodeScriptField {draft} />
  {:else}
    <NodeCommandFields {draft} />
  {/if}

  <NodeWorkingDirField {draft} />
  <NodeTimeoutRetriesFields {draft} />
</div>
