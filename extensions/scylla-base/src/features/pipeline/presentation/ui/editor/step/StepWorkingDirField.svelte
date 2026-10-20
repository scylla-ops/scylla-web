<script lang="ts">
  import { Input, Label } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { StepDraft } from './step-draft.svelte.ts';
  import { pipelineMessages } from '@base/features/pipeline/presentation/pipeline.messages.ts';

  interface Props {
    draft: StepDraft;
  }

  let { draft }: Props = $props();

  const uid = $props.id();
</script>

<div class="flex flex-col gap-2">
  <Label for="{uid}-working-dir">{t(pipelineMessages.workingDirectory)}</Label>
  <Input
    id="{uid}-working-dir"
    class="font-mono"
    value={draft.workingDir}
    oninput={event => (draft.workingDir = event.currentTarget.value)}
    placeholder={t(pipelineMessages.workingDirectoryPlaceholder)}
  />
</div>
