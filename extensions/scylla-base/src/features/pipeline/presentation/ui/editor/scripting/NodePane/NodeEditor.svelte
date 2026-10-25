<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import type { NodeDraft } from '@base/features/pipeline/presentation/ui/editor/node/node-draft.state.svelte.ts';
  import { nodePreview } from '@base/features/pipeline/presentation/presenters/node-summary.presenter.ts';
  import { scriptingMessages } from '@base/features/pipeline/presentation/messages/scripting.messages.ts';
  import NodeCommandFields from '@base/features/pipeline/presentation/ui/editor/node/NodeCommandFields.svelte';
  import NodeScriptField from '@base/features/pipeline/presentation/ui/editor/node/NodeScriptField.svelte';

  interface Props {
    draft: NodeDraft;
  }

  let { draft }: Props = $props();
</script>

<!-- A script is edited as shell code; a command, which runs with no shell, as a form. -->
{#if draft.mode === 'script'}
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
