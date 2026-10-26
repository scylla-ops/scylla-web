<script lang="ts">
  import { Input, Label } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { NodeDraft } from './node-draft.state.svelte.ts';
  import { nodeMessages } from '@base/features/pipeline/presentation/messages/node.messages.ts';

  interface Props {
    draft: NodeDraft;
  }

  let { draft }: Props = $props();

  const uid = $props.id();
</script>

<div class="flex flex-col gap-2">
  <Label for="{uid}-working-dir">{t(nodeMessages.workingDirectory)}</Label>
  <Input
    id="{uid}-working-dir"
    class="font-mono"
    value={draft.workingDir}
    oninput={event => (draft.workingDir = event.currentTarget.value)}
    placeholder={t(nodeMessages.workingDirectoryPlaceholder)}
  />
</div>
